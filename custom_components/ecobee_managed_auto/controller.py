"""Persistent single writer for optional managed Heat/Cool operation."""
import asyncio
import logging
from datetime import timedelta

from homeassistant.components import persistent_notification
from homeassistant.core import Context, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .adapter import native_thermostat, schedule_inputs
from homeassistant.const import RESTART_EXIT_CODE

from .const import HOLD_GRACE_SECONDS, SUPERVISOR_RESTART_JOBS, CONNECTION_NOTICE_SECONDS, DEFAULTS, DOMAIN, HEALTHY, NOTICES
from .policy import decision, heat_pump_window, snapshot

_LOGGER = logging.getLogger(__name__)
# Turning these off is a user action, not a fault: restore Auto and resume later.
SCHEDULE_PAUSE = "schedule_disabled_or_observation"


async def supervisor_jobs(hass):
    """Supervisor job tree, or None outside HA OS / Supervised installations."""
    from homeassistant.helpers.hassio import is_hassio
    if not is_hassio(hass):
        return None
    from homeassistant.components.hassio import get_supervisor_client
    async with asyncio.timeout(3):
        return (await get_supervisor_client(hass).jobs.info()).jobs


def _as_list(value):
    if value is None:
        return []
    return [value] if isinstance(value, str) else list(value)


class Controller:
    def __init__(self, hass, entry):
        self.hass, self.entry = hass, entry
        self.config = {**DEFAULTS, **entry.data, **entry.options}
        self.store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}")
        self.enabled = True
        self.owns = False
        self.expected = None
        self.pending = None
        self.last_change = 0.0
        self.recovering = False
        self.restore_attempts = 0
        self.recovery_modes = set()
        # Status shown once native Auto is confirmed during a recovery.
        self.after_recovery = "disabled"
        self.status = "waiting_for_auto"
        self.detail = ""
        self.sample = None
        self.cheap = None
        self.entity_id = None
        self.listeners = []
        self.publish = self._publish
        self.lock = asyncio.Lock()
        self.generation = 0
        self.contexts = set()
        self.refreshed_at = 0.0
        self.unsub = []
        self.stopped = False
        self.clean_shutdown = False
        # Set when an HA restart keeps the selected mode instead of restoring Auto.
        self.held = False
        self.resumed = False
        # After a held restart, missing data briefly is expected while integrations start.
        self.hold_grace_until = 0.0
        self.unavailable_since = None
        self.startup_notice = None
        self.notice = None

    def _publish(self):
        for listener in self.listeners:
            listener()

    async def load(self):
        saved = await self.store.async_load() or {}
        self.enabled = saved.get("enabled", True)
        self.owns = saved.get("owns", False)
        self.expected = saved.get("expected")
        self.pending = saved.get("pending")
        self.last_change = saved.get("last_change", 0.0)
        held = saved.get("held") and saved.get("clean_shutdown") and not self.pending
        if self.owns and held and self.enabled and self.config["resume_after_restart"]:
            # Kept across an HA restart: the next readback must still show the expected mode,
            # otherwise a change made while HA was down is treated as a manual override.
            self.status = "syncing"
            self.resumed = True
        elif self.owns:
            # Never blindly resume an old transaction after a restart: restore native Auto first.
            self.recovering = True
            self.recovery_modes = {self.expected, (self.pending or {}).get("previous")}
            self.status = "restoring_auto"
            self.pending = None
            # A normal stop or reload already requested Auto; resume once it is confirmed.
            if saved.get("clean_shutdown") and self.enabled and self.config["resume_after_restart"]:
                self.after_recovery = "waiting_for_auto"
            else:
                if not saved.get("clean_shutdown"):
                    self.startup_notice = "unexpected_shutdown"
                self.enabled = False
                self.after_recovery = "disabled"
        # Running from now on: an unrecorded stop is detected as unexpected.
        await self.save()

    async def save(self):
        await self.store.async_save({"enabled": self.enabled, "owns": self.owns, "expected": self.expected,
                                     "pending": self.pending, "last_change": self.last_change,
                                     "clean_shutdown": self.clean_shutdown, "held": self.held})

    @callback
    def start(self):
        self.unsub.extend([
            async_track_time_interval(self.hass, self.wake, timedelta(seconds=30)),
            async_track_state_change_event(self.hass,
                [self.config["thermostat"], self.config["aux_switch"], self.config["automation"]], self.wake),
            self.hass.bus.async_listen("call_service", self.external_service),
            self.hass.bus.async_listen("automation_reloaded", self.wake),
        ])
        if self.startup_notice:
            self._notify(self.startup_notice)
            self.startup_notice = None
        if self.resumed:
            self._log(self._text()["log"]["resume"])
            self.hold_grace_until = dt_util.utcnow().timestamp() + HOLD_GRACE_SECONDS
            self.resumed = False
        self.wake()

    @callback
    def wake(self, _event=None):
        if not self.stopped and not self.lock.locked():
            self.hass.async_create_task(self.tick())

    def _targets(self, data):
        """Entities addressed by a service call, including device and area targets."""
        service_data = data.get("service_data", {})
        ids = set(_as_list(service_data.get("entity_id")))
        if "all" in ids:
            return {self.config["thermostat"], self.config["aux_switch"]}
        devices, areas = _as_list(service_data.get("device_id")), _as_list(service_data.get("area_id"))
        if devices or areas:
            entities, devreg = er.async_get(self.hass), dr.async_get(self.hass)
            for entity_id in (self.config["thermostat"], self.config["aux_switch"]):
                entry = entities.async_get(entity_id)
                if not entry:
                    continue
                device = devreg.async_get(entry.device_id) if entry.device_id else None
                area = entry.area_id or (device.area_id if device else None)
                if entry.device_id in devices or (area and area in areas):
                    ids.add(entity_id)
        return ids

    @callback
    def external_service(self, event):
        """Honor HA manual commands immediately, before delayed cloud readback."""
        if not self.owns or event.context.id in self.contexts:
            return
        data = event.data
        domain, service = data.get("domain"), data.get("service")
        if domain not in ("climate", "switch"):
            return
        target = self.config["thermostat"] if domain == "climate" else self.config["aux_switch"]
        if target not in self._targets(data):
            return
        if (domain == "climate" and service in ("set_hvac_mode", "turn_on", "turn_off", "toggle")) or (domain == "switch" and service in ("turn_on", "turn_off", "toggle")):
            self.generation += 1
            self.enabled = self.owns = self.recovering = False
            self.expected = self.pending = None
            self.status = "manual_override"
            self._update_notice()
            self.publish()
            self.hass.async_create_task(self.save())

    async def enable(self, enabled):
        async with self.lock:
            self.generation += 1
            self.enabled = enabled
            self.detail = ""
            if self.owns:
                self._begin_recovery("waiting_for_auto" if enabled else "disabled")
            self.status = "restoring_auto" if self.owns else "waiting_for_auto" if enabled else "disabled"
            await self.save()
            self._update_notice()
            self.publish()
        await self.tick()

    def _begin_recovery(self, after):
        """Restore native Auto; `after` is the status once Auto is confirmed."""
        if not self.recovering:
            self.recovery_modes = {self.expected, (self.pending or {}).get("previous"),
                                   self.sample.mode if self.sample else None}
            self.restore_attempts = 0
        self.recovering = True
        self.pending = None
        self.after_recovery = after

    async def release(self, status):
        if self.owns and status == "manual_override":
            self._log(self._text()["log"]["override"])
        elif self.owns and self.recovering:
            self._log(self._text()["log"]["restored"])
        self.generation += 1
        self.owns = self.recovering = False
        self.pending = self.expected = None
        if status == "manual_override":
            self.enabled = False
        self.status = status
        await self.save()

    def _text(self):
        return NOTICES["zh" if (self.hass.config.language or "").lower().startswith("zh") else "en"]

    def _restore_text(self, why):
        text = self._text()
        return text["log"]["restore"].format(reason=text["reasons"].get(why, why))

    def _temperature(self, celsius):
        unit = self.hass.config.units.temperature_unit
        value = celsius * 9 / 5 + 32 if unit == "°F" else celsius
        return f"{value:.1f} {unit}"

    def _log(self, message):
        _LOGGER.info("%s: %s", self.config["thermostat"], message)
        if self.entity_id:
            self.hass.bus.async_fire("logbook_entry", {"name": self._text()["title"], "message": message,
                                                       "domain": DOMAIN, "entity_id": self.entity_id})

    async def command(self, mode, now, reason=""):
        generation = self.generation
        context = Context()
        self.contexts.add(context.id)
        if len(self.contexts) > 32:
            self.contexts = {context.id}
        # Journal BEFORE sending: a crash or HTTP error has an uncertain outcome.
        self.pending = {"mode": mode, "previous": self.sample.mode, "since": now.timestamp()}
        self.expected = mode
        await self.save()
        self.publish()
        if generation != self.generation:
            return
        if reason:
            self._log(reason)
        try:
            async with asyncio.timeout(30):
                if mode == "auxHeatOnly":
                    await self.hass.services.async_call("switch", "turn_on", {
                        "entity_id": self.config["aux_switch"]}, blocking=True, context=context)
                else:
                    await self.hass.services.async_call("climate", "set_hvac_mode", {
                        "entity_id": self.config["thermostat"],
                        "hvac_mode": "heat_cool" if mode == "auto" else mode}, blocking=True, context=context)
        except Exception:
            # Do not resend an ambiguous command. Wait for readback/timeout.
            self.detail = "command_result_uncertain"

    async def fault(self, reason):
        """Disarm. An owned mode is restored to native Auto first."""
        self.detail = reason
        self.enabled = False
        status = "command_failed" if reason == "command_not_confirmed" else "configuration_error"
        if self.owns:
            self._begin_recovery(status)
            self.status = "restoring_auto"
        else:
            self.status = status
        await self.save()

    async def pause(self, status):
        """Restore native Auto but stay armed; control resumes when conditions return."""
        self._begin_recovery(status)
        self.status = "restoring_auto"
        await self.save()

    def _notify(self, key):
        if not self.config["notify"]:
            return
        text = self._text()
        mode = (self.sample.mode if self.sample else None) or self.expected or "auto"
        message = text[key].format(mode=text["modes"].get(mode, mode), detail=self.detail or "—")
        persistent_notification.async_create(self.hass, message, title=text["title"],
                                             notification_id=f"{DOMAIN}_{self.entry.entry_id}")
        self.notice = key

    @callback
    def _update_notice(self):
        """One notification per problem; it is cleared once operation is normal again."""
        now = dt_util.utcnow().timestamp()
        key = None
        if self.status in ("restore_failed", "manual_override", "configuration_error", "command_failed"):
            key = self.status
        elif (self.status == "waiting_for_connection" and (self.enabled or self.owns) and self.unavailable_since
              and now - self.unavailable_since >= CONNECTION_NOTICE_SECONDS):
            key = "connection"
        if key and key != self.notice:
            self._notify(key)
        elif not key and self.notice and self.status in HEALTHY:
            persistent_notification.async_dismiss(self.hass, f"{DOMAIN}_{self.entry.entry_id}")
            self.notice = None

    async def tick(self):
        async with self.lock:
            # An already queued callback may run after unload released this lock.
            if self.stopped:
                return
            try:
                await self._tick()
            except Exception:
                _LOGGER.exception("Managed Auto stopped after an unexpected controller error")
                await self.fault("controller_error")
            finally:
                self._update_notice()
                self.publish()

    async def _tick(self):
        now = dt_util.utcnow()
        try:
            raw = native_thermostat(self.hass, self.config["thermostat"], self.config["aux_switch"])
            self.sample = snapshot(raw, now, self.config["maximum_data_age_minutes"])
        except (ValueError, KeyError, AttributeError, TypeError, OverflowError) as exc:
            self.sample = None
            self.detail = str(exc) if isinstance(exc, ValueError) else "native_data_unavailable"
            self.unavailable_since = self.unavailable_since or now.timestamp()
            if self.owns and now.timestamp() < self.hold_grace_until:
                self.status = "waiting_for_connection"
            elif self.owns:
                # Stay armed: restore Auto once valid data returns, then resume.
                if not self.recovering:
                    self._begin_recovery("waiting_for_auto" if self.enabled else "disabled")
                self.status = "waiting_for_connection"
                await self.save()
            else:
                self.status = "waiting_for_connection"
            return
        self.unavailable_since = None
        self.hold_grace_until = 0.0
        value = self.sample
        # Off always wins, including during recovery and a pending command.
        if self.owns and value.mode == "off":
            await self.release("manual_override")
            return
        climate = self.hass.states.get(self.config["thermostat"])
        aux = self.hass.states.get(self.config["aux_switch"])
        ha_mode = {"auto": "heat_cool", "auxHeatOnly": "heat"}.get(value.mode, value.mode)
        lagging = [entity_id for entity_id, state, wanted in (
            (self.config["thermostat"], climate, ha_mode),
            (self.config["aux_switch"], aux, "on" if value.mode == "auxHeatOnly" else "off"))
            if not state or state.state != wanted]
        if lagging:
            # HA entities poll separately (the Aux switch every 30 s); refresh them from the
            # native cache now instead of waiting, and act only once they agree.
            self._refresh(lagging, now.timestamp())
            if not self.pending and not self.recovering:
                self.status = "syncing"
            return
        if self.pending:
            if value.mode == self.pending["mode"]:
                self.pending = None
                self.last_change = now.timestamp()
                await self.save()
            elif value.mode != self.pending["previous"]:
                await self.release("manual_override")
                return
            elif now.timestamp() - self.pending["since"] < self.config["acknowledgement_minutes"] * 60:
                self.status = "restoring_auto" if self.recovering else "awaiting_device"
                return
            else:
                self.pending = None
                await self.fault("command_not_confirmed")
        elif self.owns and value.mode != self.expected and not self.recovering:
            await self.release("manual_override")
            return
        if self.recovering:
            if value.mode == "auto":
                await self.release(self.after_recovery if self.enabled or self.after_recovery != "waiting_for_auto" else "disabled")
            elif value.mode not in ("auxHeatOnly", "cool") or value.mode not in self.recovery_modes:
                await self.release("manual_override")
            elif self.restore_attempts < 2:
                self.restore_attempts += 1
                self.status = "restoring_auto"
                await self.command("auto", now, self._restore_text(self.after_recovery))
            else:
                self.status = "restore_failed"
            return
        if not self.enabled:
            if self.status not in ("manual_override", "configuration_error", "command_failed"):
                self.status = "disabled"
            return
        try:
            inputs = schedule_inputs(self.hass, self.config["automation"],
                self.config["thermostat"], self.config["aux_switch"], self.entity_id)
            self.cheap = heat_pump_window(inputs, dt_util.as_local(now))
            automation = self.hass.states.get(self.config["automation"])
            if not automation or automation.state != "on" or inputs.get("observation_mode", True):
                raise ValueError(SCHEDULE_PAUSE)
        except (ValueError, AttributeError, TypeError) as exc:
            reason = str(exc)
            if reason == SCHEDULE_PAUSE:
                self.detail = reason
                if self.owns:
                    await self.pause("schedule_paused")
                else:
                    self.status = "schedule_paused"
            elif self.owns:
                await self.fault(reason)
            else:
                self.status, self.detail = "waiting_for_schedule", reason
            return
        if not self.owns:
            if value.mode != "auto":
                self.status = "waiting_for_auto"
                self.detail = ""
                return
            self.owns = True
            self.expected = "auto"
            self.last_change = 0
            await self.save()
            self._log(self._text()["log"]["acquire"])
            self.publish()  # The Blueprint sees ownership before the first mode command.
        target, why = decision(value, self.cheap)
        self.detail = ""
        if target == value.mode:
            self.status = "heat_pump_window" if self.cheap else "furnace_selected" if target == "auxHeatOnly" else "cooling_selected"
            return
        if now.timestamp() - self.last_change < self.config["minimum_mode_minutes"] * 60:
            self.status = "minimum_mode_wait"
            return
        self.status = "awaiting_device"
        reason = self._text()["log"][why].format(current=self._temperature(value.current),
            heat=self._temperature(value.heat), cool=self._temperature(value.cool))
        await self.command(target, now, reason)

    def _refresh(self, entity_ids, now):
        if now - self.refreshed_at < 15 or not self.hass.services.has_service("homeassistant", "update_entity"):
            return
        self.refreshed_at = now
        self.hass.async_create_task(self.hass.services.async_call(
            "homeassistant", "update_entity", {"entity_id": entity_ids}, blocking=False))

    async def _restarting(self):
        """True when HA is coming straight back rather than shutting down.

        A core `homeassistant.restart` sets the restart exit code. Under the Supervisor
        (HA OS / Supervised) every restart, including the UI button, `ha core restart` and
        Core updates, arrives as a plain SIGTERM, so ask the Supervisor whether one of its
        restart jobs is running. Anything unclear counts as a shutdown and restores Auto.
        """
        if getattr(self.hass, "exit_code", 0) == RESTART_EXIT_CODE:
            return True
        try:
            jobs = list(await supervisor_jobs(self.hass) or [])
        except Exception:  # noqa: BLE001 - Supervisor unreachable or an older client.
            return False
        while jobs:
            job = jobs.pop()
            if job.name in SUPERVISOR_RESTART_JOBS and not job.done:
                return True
            jobs.extend(job.child_jobs or [])
        return False

    async def stop(self):
        if self.stopped:
            return
        self.stopped = True
        for unsubscribe in self.unsub:
            unsubscribe()
        self.unsub.clear()
        async with self.lock:
            # Best effort only; an abrupt host/network loss cannot execute this. `enabled`
            # is kept so a normal restart or options reload resumes after Auto is confirmed.
            climate = self.hass.states.get(self.config["thermostat"])
            restarting = await self._restarting()
            self.held = bool(restarting and self.owns and self.enabled and not self.recovering and not self.pending
                             and self.config["resume_after_restart"])
            if self.held:
                self._log(self._text()["log"]["hold"])
            elif self.owns and self.sample and self.sample.mode != "off" and climate and climate.state != "off":
                self.recovering = True
                await self.command("auto", dt_util.utcnow(), self._restore_text("shutdown"))
            self.clean_shutdown = True
            await self.save()

    @property
    def attributes(self):
        data = {"thermostat": self.config["thermostat"], "automation": self.config["automation"],
                "owns_mode": self.owns, "status": self.status, "detail": self.detail,
                "heat_pump_window": self.cheap, "pending_mode": (self.pending or {}).get("mode"),
                "settings_url": f"/config/integrations/integration/{DOMAIN}"}
        if self.sample:
            data.update({"device_mode": self.sample.mode, "heat_target_c": self.sample.heat,
                         "cool_target_c": self.sample.cool, "current_c": self.sample.current,
                         "runtime_updated": self.sample.updated.isoformat()})
        return data

    @property
    def diagnostics(self):
        return {"enabled": self.enabled, "owns": self.owns, "expected": self.expected, "pending": self.pending,
                "recovering": self.recovering, "recovery_modes": sorted(m for m in self.recovery_modes if m),
                "restore_attempts": self.restore_attempts, "after_recovery": self.after_recovery,
                "last_change": self.last_change, "unavailable_since": self.unavailable_since,
                "notice": self.notice, "attributes": self.attributes}
