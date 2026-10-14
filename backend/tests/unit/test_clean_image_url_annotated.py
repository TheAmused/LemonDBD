# backend/tests/unit/test_clean_image_url_annotated.py
"""Tests verifying CleanImageUrl Annotated type behavior on tier list and smash or pass models."""
import pytest
from pydantic import BaseModel

from app.schemas.common import CleanImageUrl
from app.schemas.tier_list import TierListAdminItem, TierListAdminTier
from app.schemas.smash_or_pass import SmashRosterAdminCreate


class SampleImageModel(BaseModel):
    url: CleanImageUrl = None


@pytest.mark.unit
def test_clean_image_url_valid_https():
    m = SampleImageModel(url="https://images.example.com/banner.webp")
    assert m.url == "https://images.example.com/banner.webp"


@pytest.mark.unit
def test_clean_image_url_valid_static():
    m = SampleImageModel(url="/static/images/avatar.png")
    assert m.url == "/static/images/avatar.png"


@pytest.mark.unit
def test_clean_image_url_valid_data_uri():
    data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    m = SampleImageModel(url=data_uri)
    assert m.url == data_uri


@pytest.mark.unit
def test_clean_image_url_drops_insecure_http_and_malformed():
    assert SampleImageModel(url="http://insecure.example.com/img.png").url is None
    assert SampleImageModel(url="javascript:alert(1)").url is None
    assert SampleImageModel(url="/static/../secret.txt").url is None
    assert SampleImageModel(url="").url is None
    assert SampleImageModel(url=None).url is None


@pytest.mark.unit
def test_tier_list_and_smash_models_use_clean_image():
    tier = TierListAdminTier(id="s", label="S", color="#ff0000", backgroundImage="http://insecure.test/bg.png")
    assert tier.backgroundImage is None

    tier_valid = TierListAdminTier(id="s", label="S", color="#ff0000", backgroundImage="https://secure.test/bg.png")
    assert tier_valid.backgroundImage == "https://secure.test/bg.png"

    item = TierListAdminItem(id="item1", name="Item 1", image_url="invalid_url")
    assert item.image_url is None
