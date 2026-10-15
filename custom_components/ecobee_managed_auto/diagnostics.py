"""Diagnostics download: controller state only; the entry holds no credentials."""


async def async_get_config_entry_diagnostics(hass, entry):
    result = {"data": dict(entry.data), "options": dict(entry.options)}
    runtime = getattr(entry, "runtime_data", None)
    if entry.data.get("entry_type") == "installation":
        result["installation"] = runtime
    else:
        result["controller"] = runtime.diagnostics if runtime is not None else None
    return result
