"""Tests for the Redis-backed translation worker."""

import json
from unittest.mock import MagicMock, patch

import redis as redis_lib

from translate.worker import main


class TestWorkerMain:
    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_processes_valid_job(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        job_data = {"id": "job-001", "text": "Hello", "targetLang": "fr", "sourceLang": "en"}

        def stop_after_one(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            return ("transyn:jobs", json.dumps(job_data))

        mock_conn.brpop = MagicMock(side_effect=stop_after_one)

        mock_model = MagicMock()
        mock_model.translate.return_value = {
            "translatedText": "Bonjour",
            "sourceLang": "en",
            "targetLang": "fr",
        }
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_conn.set.assert_called_once()
        stored_key = mock_conn.set.call_args.args[0]
        stored_value = json.loads(mock_conn.set.call_args.args[1])
        assert stored_key == "transyn:result:job-001"
        assert stored_value["translatedText"] == "Bonjour"
        assert stored_value["sourceLang"] == "en"
        assert stored_value["targetLang"] == "fr"

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_skips_incomplete_job_missing_id(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        incomplete_job = {"text": "Hello", "targetLang": "fr"}

        def stop_after_one(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            return ("transyn:jobs", json.dumps(incomplete_job))

        mock_conn.brpop = MagicMock(side_effect=stop_after_one)

        mock_model = MagicMock()
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_model.translate.assert_not_called()
        mock_conn.set.assert_not_called()

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_skips_invalid_json_payload(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        def stop_after_one(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            return ("transyn:jobs", "not valid json {{{")

        mock_conn.brpop = MagicMock(side_effect=stop_after_one)

        mock_model = MagicMock()
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_model.translate.assert_not_called()
        mock_conn.set.assert_not_called()

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_handles_translation_failure(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        job_data = {"id": "job-002", "text": "Hello", "targetLang": "fr"}

        def stop_after_one(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            return ("transyn:jobs", json.dumps(job_data))

        mock_conn.brpop = MagicMock(side_effect=stop_after_one)

        mock_model = MagicMock()
        mock_model.translate.side_effect = RuntimeError("Model inference failed")
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_model.translate.assert_called_once()
        mock_conn.set.assert_not_called()

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_handles_redis_connection_error(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        def raise_error_then_stop(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            raise redis_lib.ConnectionError("Connection refused")

        mock_conn.brpop = MagicMock(side_effect=raise_error_then_stop)

        mock_model = MagicMock()
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_model.translate.assert_not_called()

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_handles_redis_timeout_error(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        def raise_timeout_then_stop(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            raise redis_lib.TimeoutError("Timeout")

        mock_conn.brpop = MagicMock(side_effect=raise_timeout_then_stop)

        mock_model = MagicMock()
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_model.translate.assert_not_called()

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_skips_null_brpop_result(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        def stop_after_null(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            return None

        mock_conn.brpop = MagicMock(side_effect=stop_after_null)

        mock_model = MagicMock()
        mock_translation_model_cls.return_value = mock_model

        main()

        mock_model.translate.assert_not_called()
        mock_conn.set.assert_not_called()

    @patch("redis.from_url")
    @patch("translate.worker.TranslationModel")
    @patch("translate.worker.Settings")
    @patch("translate.worker.running", True)
    def test_handles_result_storage_failure(
        self,
        mock_settings_cls: MagicMock,
        mock_translation_model_cls: MagicMock,
        mock_from_url: MagicMock,
    ) -> None:
        mock_settings = MagicMock()
        mock_settings.log_level = "INFO"
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.model_name = "facebook/m2m100_418M"
        mock_settings.quantization = None
        mock_settings.job_list_key = "transyn:jobs"
        mock_settings.result_key_prefix = "transyn:result:"
        mock_settings.result_ttl_seconds = 3600
        mock_settings.poll_timeout_seconds = 5
        mock_settings_cls.return_value = mock_settings

        mock_conn = MagicMock()
        mock_from_url.return_value = mock_conn

        job_data = {"id": "job-003", "text": "Hello", "targetLang": "fr"}

        def stop_after_one(_keys: object, timeout: object) -> object:
            import translate.worker as worker_mod
            worker_mod.running = False
            return ("transyn:jobs", json.dumps(job_data))

        mock_conn.brpop = MagicMock(side_effect=stop_after_one)

        mock_model = MagicMock()
        mock_model.translate.return_value = {
            "translatedText": "Bonjour",
            "sourceLang": "en",
            "targetLang": "fr",
        }
        mock_translation_model_cls.return_value = mock_model

        mock_conn.set.side_effect = redis_lib.ConnectionError("Cannot store")

        main()

        mock_model.translate.assert_called_once()
