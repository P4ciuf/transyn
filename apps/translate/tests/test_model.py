"""Tests for TranslationModel class."""

from unittest.mock import MagicMock, call, patch

import torch

from translate.model import TranslationModel


class TestTranslationModel:
    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_initialization_without_quantization(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model

        with patch.object(torch.cuda, "is_available", return_value=False):
            model_instance = TranslationModel("tencent/Hy-MT2-1.8B")

        mock_tokenizer_cls.from_pretrained.assert_called_once_with(
            "tencent/Hy-MT2-1.8B", trust_remote_code=True
        )
        mock_model_cls.from_pretrained.assert_called_once_with(
            "tencent/Hy-MT2-1.8B", trust_remote_code=True
        )
        mock_model.to.assert_called_once_with("cpu")
        mock_model.eval.assert_called_once()
        assert model_instance.tokenizer == mock_tokenizer
        assert model_instance.model == mock_model

    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_initialization_with_int8_quantization(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model

        with patch("translate.model.BitsAndBytesConfig") as mock_bnb:
            model_instance = TranslationModel("tencent/Hy-MT2-1.8B", quantization="int8")

        mock_bnb.assert_called_once_with(load_in_8bit=True)
        mock_model_cls.from_pretrained.assert_called_once()
        call_kwargs = mock_model_cls.from_pretrained.call_args.kwargs
        assert "quantization_config" in call_kwargs
        assert call_kwargs["device_map"] == "auto"
        mock_model.to.assert_not_called()
        mock_model.eval.assert_called_once()

    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_initialization_with_hf_token(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model

        with patch.object(torch.cuda, "is_available", return_value=False):
            TranslationModel("tencent/Hy-MT2-1.8B", hf_token="hf_secret")

        mock_tokenizer_cls.from_pretrained.assert_called_once_with(
            "tencent/Hy-MT2-1.8B", trust_remote_code=True, token="hf_secret"
        )
        mock_model_cls.from_pretrained.assert_called_once_with(
            "tencent/Hy-MT2-1.8B", trust_remote_code=True, token="hf_secret"
        )

    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_translate_success(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cpu")

        input_ids = torch.tensor([[101, 102, 103]])
        attention_mask = torch.tensor([[1, 1, 1]])
        encoded = {"input_ids": input_ids, "attention_mask": attention_mask}
        mock_tokenizer.apply_chat_template.return_value = encoded

        generated = torch.tensor([[101, 102, 103, 201, 202, 203]])
        mock_model.generate.return_value = generated
        mock_tokenizer.decode.return_value = "Bonjour le monde"

        model_instance = TranslationModel("tencent/Hy-MT2-1.8B")
        result = model_instance.translate("Hello world", "fr")

        mock_tokenizer.apply_chat_template.assert_called_once()
        messages = mock_tokenizer.apply_chat_template.call_args.args[0]
        assert messages[0]["role"] == "user"
        assert "French" in messages[0]["content"]
        assert "Hello world" in messages[0]["content"]

        mock_model.generate.assert_called_once()
        gen_kwargs = mock_model.generate.call_args.kwargs
        assert gen_kwargs["max_new_tokens"] == 512
        assert gen_kwargs["temperature"] == 0.7
        assert gen_kwargs["top_p"] == 0.6
        assert gen_kwargs["top_k"] == 20
        assert gen_kwargs["repetition_penalty"] == 1.05
        assert gen_kwargs["do_sample"] is True

        decode_args = mock_tokenizer.decode.call_args.args[0]
        expected_new_tokens = generated[0][3:]
        assert torch.equal(decode_args, expected_new_tokens)
        assert mock_tokenizer.decode.call_args.kwargs["skip_special_tokens"] is True

        assert result == {"translatedText": "Bonjour le monde", "targetLang": "fr"}

    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_translate_unknown_language_code_falls_back(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cpu")

        encoded = {"input_ids": torch.tensor([[1, 2]]), "attention_mask": torch.tensor([[1, 1]])}
        mock_tokenizer.apply_chat_template.return_value = encoded

        generated = torch.tensor([[1, 2, 3, 4]])
        mock_model.generate.return_value = generated
        mock_tokenizer.decode.return_value = "Some translation"

        model_instance = TranslationModel("tencent/Hy-MT2-1.8B")
        result = model_instance.translate("Hello", "xx")

        messages = mock_tokenizer.apply_chat_template.call_args.args[0]
        assert "xx" in messages[0]["content"]
        assert result == {"translatedText": "Some translation", "targetLang": "xx"}

    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_translate_strips_input_tokens_from_output(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cpu")

        input_ids = torch.tensor([[1, 2, 3, 4, 5]])
        encoded = {"input_ids": input_ids, "attention_mask": torch.tensor([[1, 1, 1, 1, 1]])}
        mock_tokenizer.apply_chat_template.return_value = encoded

        generated = torch.tensor([[1, 2, 3, 4, 5, 10, 20, 30]])
        mock_model.generate.return_value = generated
        mock_tokenizer.decode.return_value = "Translated output"

        model_instance = TranslationModel("tencent/Hy-MT2-1.8B")
        model_instance.translate("Test text", "de")

        decode_args = mock_tokenizer.decode.call_args.args[0]
        assert len(decode_args) == 3
        assert torch.equal(decode_args, torch.tensor([10, 20, 30]))

    @patch("translate.model.AutoTokenizer")
    @patch("translate.model.AutoModelForCausalLM")
    def test_translate_moves_inputs_to_model_device(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cpu")

        input_ids = torch.tensor([[1, 2]])
        encoded = {"input_ids": input_ids, "attention_mask": torch.tensor([[1, 1]])}
        mock_tokenizer.apply_chat_template.return_value = encoded

        generated = torch.tensor([[1, 2, 3]])
        mock_model.generate.return_value = generated
        mock_tokenizer.decode.return_value = ""

        model_instance = TranslationModel("tencent/Hy-MT2-1.8B")
        model_instance.translate("test", "fr")

        gen_kwargs = mock_model.generate.call_args.kwargs
        assert "input_ids" in gen_kwargs
        assert "attention_mask" in gen_kwargs
