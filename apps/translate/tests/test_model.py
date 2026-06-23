"""Tests for TranslationModel class."""

from unittest.mock import MagicMock, patch

import pytest
import torch

from translate.model import TranslationModel


class TestTranslationModel:
    @patch("translate.model.M2M100Tokenizer")
    @patch("translate.model.M2M100ForConditionalGeneration")
    def test_initialization_without_quantization(self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model

        with patch.object(torch.cuda, "is_available", return_value=False):
            model_instance = TranslationModel("facebook/m2m100_418M")

        mock_tokenizer_cls.from_pretrained.assert_called_once_with("facebook/m2m100_418M")
        mock_model_cls.from_pretrained.assert_called_once_with("facebook/m2m100_418M")
        mock_model.to.assert_called_once_with("cpu")
        mock_model.eval.assert_called_once()
        assert model_instance.tokenizer == mock_tokenizer
        assert model_instance.model == mock_model

    @patch("translate.model.M2M100Tokenizer")
    @patch("translate.model.M2M100ForConditionalGeneration")
    def test_initialization_with_int8_quantization(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model

        with patch("translate.model.BitsAndBytesConfig") as mock_bnb:
            model_instance = TranslationModel("facebook/m2m100_418M", quantization="int8")

        mock_bnb.assert_called_once_with(load_in_8bit=True)
        mock_model_cls.from_pretrained.assert_called_once()
        call_kwargs = mock_model_cls.from_pretrained.call_args.kwargs
        assert "quantization_config" in call_kwargs
        assert call_kwargs["device_map"] == "auto"
        mock_model.to.assert_not_called()
        mock_model.eval.assert_called_once()

    @patch("translate.model.M2M100Tokenizer")
    @patch("translate.model.M2M100ForConditionalGeneration")
    def test_translate_with_source_lang(self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        # device attribute needed by model.py
        mock_model.device = torch.device("cpu")

        encoded_input = {"input_ids": torch.tensor([[1, 2, 3]]), "attention_mask": torch.tensor([[1, 1, 1]])}
        mock_tokenizer.return_value = encoded_input
        mock_tokenizer.get_lang_id.return_value = 42

        generated_tensor = torch.tensor([[4, 5, 6, 7]])
        mock_model.generate.return_value = generated_tensor
        mock_tokenizer.decode.return_value = "Bonjour le monde"

        model_instance = TranslationModel("facebook/m2m100_418M")

        result = model_instance.translate("Hello world", "fr", source_lang="en")

        assert mock_tokenizer.src_lang == "en"
        assert mock_tokenizer.tgt_lang == "fr"
        mock_tokenizer.assert_called_with(
            "Hello world", return_tensors="pt", truncation=True, max_length=512
        )
        mock_model.generate.assert_called_once()
        mock_tokenizer.decode.assert_called_once()
        decode_call = mock_tokenizer.decode.call_args
        assert decode_call.kwargs.get("skip_special_tokens") is True
        assert torch.equal(decode_call.args[0], generated_tensor[0])

        assert result["translatedText"] == "Bonjour le monde"
        assert result["sourceLang"] == "en"
        assert result["targetLang"] == "fr"

    @patch("translate.model.M2M100Tokenizer")
    @patch("translate.model.M2M100ForConditionalGeneration")
    def test_translate_without_source_lang(self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cpu")

        mock_tokenizer.src_lang = "en"
        encoded = {"input_ids": torch.tensor([[1, 2]])}
        mock_tokenizer.return_value = encoded
        mock_tokenizer.get_lang_id.return_value = 42
        mock_model.generate.return_value = torch.tensor([[4, 5]])
        mock_tokenizer.decode.return_value = "Hola mundo"

        model_instance = TranslationModel("facebook/m2m100_418M")

        result = model_instance.translate("Hello world", "es")

        assert mock_tokenizer.src_lang == "en"
        assert mock_tokenizer.tgt_lang == "es"
        assert result["translatedText"] == "Hola mundo"
        assert result["sourceLang"] == "en"
        assert result["targetLang"] == "es"

    @patch("translate.model.M2M100Tokenizer")
    @patch("translate.model.M2M100ForConditionalGeneration")
    def test_translate_without_source_lang_falls_back_to_en(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cpu")

        mock_tokenizer.src_lang = None
        encoded = {"input_ids": torch.tensor([[1, 2]])}
        mock_tokenizer.return_value = encoded
        mock_tokenizer.get_lang_id.return_value = 42
        mock_model.generate.return_value = torch.tensor([[4, 5]])
        mock_tokenizer.decode.return_value = "Ciao mondo"

        model_instance = TranslationModel("facebook/m2m100_418M")

        result = model_instance.translate("Hello world", "it")

        assert mock_tokenizer.src_lang == "en"
        assert result["translatedText"] == "Ciao mondo"
        assert result["sourceLang"] == "en"
        assert result["targetLang"] == "it"

    @patch("translate.model.M2M100Tokenizer")
    @patch("translate.model.M2M100ForConditionalGeneration")
    def test_translate_moves_encoded_input_to_model_device(
        self, mock_model_cls: MagicMock, mock_tokenizer_cls: MagicMock
    ) -> None:
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer
        mock_model_cls.from_pretrained.return_value = mock_model
        mock_model.device = torch.device("cuda:0")

        encoded = {"input_ids": torch.tensor([[1, 2]]), "attention_mask": torch.tensor([[1, 1]])}
        mock_tokenizer.return_value = encoded
        mock_tokenizer.get_lang_id.return_value = 42
        mock_model.generate.return_value = torch.tensor([[4, 5]])
        mock_tokenizer.decode.return_value = ""

        model_instance = TranslationModel("facebook/m2m100_418M")

        model_instance.translate("test", "fr", source_lang="en")

        # The encoded tensors should have been moved to the model's device
        generate_call_kwargs = mock_model.generate.call_args.kwargs
        # input_ids should have been .to(model.device)
        assert generate_call_kwargs is not None
