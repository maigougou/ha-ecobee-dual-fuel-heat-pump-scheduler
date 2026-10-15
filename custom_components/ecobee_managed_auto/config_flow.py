"""UI setup/options without new cloud credentials or fixed entity names."""
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.util import dt as dt_util

from .adapter import native_thermostat
from .const import DEFAULTS, DOMAIN

# Validation reasons with their own form message; anything else is invalid_equipment.
REASONS = ("select_native_ecobee_entities", "entities_must_share_device", "select_auxiliary_heat_only_switch",
           "native_thermostat_unavailable", "thermostat_offline", "auto_or_heat_pump_not_supported",
           "stale_runtime", "invalid_temperature", "invalid_auto_setpoint_gap")
from .policy import snapshot


def schema(defaults):
    fields = {}
    for key, domain in (("thermostat", "climate"), ("aux_switch", "switch"), ("automation", "automation")):
        filters = {"domain": domain}
        if domain != "automation":
            filters["integration"] = "ecobee"
        fields[vol.Required(key, **({"default": defaults[key]} if key in defaults else {}))] = selector.EntitySelector(
            selector.EntitySelectorConfig(filter=[filters]))
    for key, low, high in (("minimum_mode_minutes", 5, 30), ("maximum_data_age_minutes", 15, 30), ("acknowledgement_minutes", 5, 15)):
        fields[vol.Required(key, default=defaults.get(key, DEFAULTS[key]))] = selector.NumberSelector(
            selector.NumberSelectorConfig(min=low, max=high, step=1, mode=selector.NumberSelectorMode.BOX, unit_of_measurement="min"))
    for key in ("resume_after_restart", "notify"):
        fields[vol.Required(key, default=defaults.get(key, DEFAULTS[key]))] = selector.BooleanSelector()
    fields[vol.Required("accept_cloud_limitations", default=defaults.get("accept_cloud_limitations", False))] = selector.BooleanSelector()
    return vol.Schema(fields)


def validate(hass, data):
    if not data.get("accept_cloud_limitations"):
        return "accept_limitations"
    try:
        raw = native_thermostat(hass, data["thermostat"], data["aux_switch"])
        snapshot(raw, dt_util.utcnow(), data["maximum_data_age_minutes"])
    except ValueError as exc:
        return str(exc) if str(exc) in REASONS else "invalid_equipment"
    except (AttributeError, KeyError, TypeError):
        return "invalid_equipment"
    return None


class ManagedAutoConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        # Preserve direct form submissions from older flows during upgrades.
        if user_input is not None:
            return await self.async_step_controller(user_input)
        return self.async_show_menu(step_id="user", menu_options=["installation", "controller"])

    async def async_step_installation(self, user_input=None):
        await self.async_set_unique_id("package_installation")
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="ecobee Blueprint & card", data={"entry_type":"installation", **user_input})
        return self.async_show_form(step_id="installation", data_schema=installation_schema({}))

    async def async_step_controller(self, user_input=None):
        errors = {}
        if user_input is not None:
            if error := validate(self.hass, user_input):
                errors["base"] = error
            else:
                await self.async_set_unique_id(user_input["thermostat"])
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title="ecobee Managed Auto", data=user_input)
        return self.async_show_form(step_id="controller", data_schema=schema(user_input or {}), errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        if config_entry.data.get("entry_type") == "installation":
            return InstallationOptionsFlow()
        return ManagedAutoOptionsFlow()


class ManagedAutoOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        errors = {}
        if user_input is not None:
            if error := validate(self.hass, user_input):
                errors["base"] = error
            elif user_input["thermostat"] != self.config_entry.data["thermostat"]:
                errors["base"] = "thermostat_change"
            else:
                return self.async_create_entry(title="", data=user_input)
        values = user_input or {**self.config_entry.data, **self.config_entry.options}
        return self.async_show_form(step_id="init", data_schema=schema(values), errors=errors)


def installation_schema(defaults):
    return vol.Schema({vol.Required("blueprint_language",default=defaults.get("blueprint_language","en")):selector.SelectSelector(
        selector.SelectSelectorConfig(options=[{"value":"en","label":"English"},{"value":"zh","label":"简体中文"}]))})


class InstallationOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        return await self.async_step_installation(user_input)

    async def async_step_installation(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="",data=user_input)
        return self.async_show_form(step_id="installation",data_schema=installation_schema({**self.config_entry.data,**self.config_entry.options}))
