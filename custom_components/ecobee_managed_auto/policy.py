"""Pure mode selection. Temperatures use Celsius; never creates setpoint holds."""
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
import math

from .const import DAYS


@dataclass(frozen=True)
class Snapshot:
    mode: str
    current: float
    heat: float
    cool: float
    updated: datetime
    equipment: str


def snapshot(raw: dict, now: datetime, maximum_age: float) -> Snapshot:
    """Use the native integration cache, including BOTH current Comfort targets."""
    runtime, settings = raw["runtime"], raw["settings"]
    if runtime.get("connected") is not True:
        raise ValueError("thermostat_offline")
    if not settings.get("hasHeatPump") or not settings.get("autoHeatCoolFeatureEnabled"):
        raise ValueError("auto_or_heat_pump_not_supported")
    updated = datetime.fromisoformat(runtime["lastStatusModified"]).replace(tzinfo=timezone.utc)
    if not -60 <= (now - updated).total_seconds() <= maximum_age * 60:
        raise ValueError("stale_runtime")
    values = tuple((float(runtime[k]) / 10 - 32) * 5 / 9
                   for k in ("actualTemperature", "desiredHeat", "desiredCool"))
    if not all(math.isfinite(v) and -40 <= v <= 60 for v in values):
        raise ValueError("invalid_temperature")
    if values[2] - values[1] < 0.5:
        raise ValueError("invalid_auto_setpoint_gap")
    if settings["hvacMode"] not in ("auto", "cool", "auxHeatOnly", "heat", "off"):
        raise ValueError("unsupported_mode")
    return Snapshot(settings["hvacMode"], *values, updated, raw.get("equipmentStatus", ""))


def heat_pump_window(inputs: dict, now: datetime) -> bool:
    start = time.fromisoformat(inputs.get("start_time", "23:00:00"))
    end = time.fromisoformat(inputs.get("end_time", "07:00:00"))
    days = inputs.get("weekdays", list(DAYS))
    if start == end or not days or set(days) - set(DAYS):
        raise ValueError("invalid_schedule")
    clock = now.time().replace(tzinfo=None)
    if start < end:
        return start <= clock < end and DAYS[now.weekday()] in days
    anchor = now - timedelta(days=1) if clock < end else now
    return (clock >= start or clock < end) and DAYS[anchor.weekday()] in days


def decision(value: Snapshot, cheap: bool) -> tuple[str, str]:
    """Daytime uses mutually exclusive Cool/Aux modes, with the full deadband.

    Select the heating side at/below the heat target and the cooling side at/above
    the cool target. Within the deadband retain the last side; on first entry pick
    the nearest target. Native differentials still decide when equipment starts.
    Returns the mode and the reason key used for the logbook.
    """
    if cheap:
        return "auto", "window"
    if value.current <= value.heat:
        return "auxHeatOnly", "heat"
    if value.current >= value.cool:
        return "cool", "cool"
    if value.mode in ("cool", "auxHeatOnly"):
        return value.mode, "retain"
    if value.current < (value.heat + value.cool) / 2:
        return "auxHeatOnly", "nearest_heat"
    return "cool", "nearest_cool"


def desired_mode(value: Snapshot, cheap: bool) -> str:
    return decision(value, cheap)[0]
