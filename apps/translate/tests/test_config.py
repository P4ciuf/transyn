"""Tests for Settings class."""

import os
from unittest.mock import patch

from translate.config import Settings


class TestSettings:
    def test_default_values(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            settings = Settings()
            assert settings.redis_url == "redis://localhost:6379"
            assert settings.model_name == "facebook/m2m100_418M"
            assert settings.quantization is None
            assert settings.log_level == "INFO"
            assert settings.max_input_length == 512
            assert settings.job_list_key == "transyn:jobs"
            assert settings.result_key_prefix == "transyn:result:"
            assert settings.result_ttl_seconds == 3600
            assert settings.poll_timeout_seconds == 5

    def test_loads_from_environment(self) -> None:
        with patch.dict(
            os.environ,
            {
                "REDIS_URL": "redis://custom:6380",
                "MODEL_NAME": "facebook/m2m100_1.2B",
                "QUANTIZATION": "int8",
                "LOG_LEVEL": "DEBUG",
                "MAX_INPUT_LENGTH": "1024",
                "JOB_LIST_KEY": "custom:jobs",
                "RESULT_KEY_PREFIX": "custom:result:",
                "RESULT_TTL_SECONDS": "7200",
                "POLL_TIMEOUT_SECONDS": "10",
            },
            clear=True,
        ):
            settings = Settings()
            assert settings.redis_url == "redis://custom:6380"
            assert settings.model_name == "facebook/m2m100_1.2B"
            assert settings.quantization == "int8"
            assert settings.log_level == "DEBUG"
            assert settings.max_input_length == 1024
            assert settings.job_list_key == "custom:jobs"
            assert settings.result_key_prefix == "custom:result:"
            assert settings.result_ttl_seconds == 7200
            assert settings.poll_timeout_seconds == 10

    def test_case_insensitive_env_vars(self) -> None:
        with patch.dict(
            os.environ,
            {"redis_url": "redis://lowercase:6379"},
            clear=True,
        ):
            settings = Settings()
            assert settings.redis_url == "redis://lowercase:6379"

    def test_int_parsing(self) -> None:
        with patch.dict(
            os.environ,
            {"MAX_INPUT_LENGTH": "256", "RESULT_TTL_SECONDS": "1800", "POLL_TIMEOUT_SECONDS": "30"},
            clear=True,
        ):
            settings = Settings()
            assert settings.max_input_length == 256
            assert settings.result_ttl_seconds == 1800
            assert settings.poll_timeout_seconds == 30
            assert isinstance(settings.max_input_length, int)
