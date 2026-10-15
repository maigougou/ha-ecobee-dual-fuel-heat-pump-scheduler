"""Validate the distributable YAML with the real Home Assistant schemas."""

import pytest

from homeassistant.components.automation.config import async_validate_config_item


def test_blueprint_metadata_and_required_version(blueprint):
    assert blueprint.domain == "automation"
    assert blueprint.validate() is None
    assert blueprint.metadata["homeassistant"]["min_version"] == "2024.12.0"


@pytest.mark.asyncio
@pytest.mark.parametrize("overrides", [{}, {"manage_cutoff": True, "cutoff_entity": "number.test_ecobee_compressor_minimum_temperature"}])
async def test_expanded_automation_schema(ha, expand_blueprint, overrides):
    expanded = expand_blueprint(**overrides)
    assert "blueprint" not in expanded
    assert "use_blueprint" not in expanded
    config = await async_validate_config_item(ha.hass, "automation", expanded)
    assert config is not None
    assert config.validation_status == "ok", config.validation_error
