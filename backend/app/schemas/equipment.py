# backend/app/schemas/equipment.py
from pydantic import BaseModel, ConfigDict, Field

RARITY_PATTERN = r"^(Common|Uncommon|Rare|Very Rare|Ultra Rare|Special|Event)$"


class ItemCategoryBase(BaseModel):
    """A class of survivor item. `name` is the singular label `items.category`
    used; `addon_target_label` is the plural one `addons.associated_target`
    used for the same class."""

    id: int
    name: str = Field(..., max_length=64)
    addon_target_label: str = Field(..., max_length=64)
    role: str = Field("Survivor", pattern=r"^(Survivor|Killer|All)$")


class ItemCategoryResponse(ItemCategoryBase):
    model_config = ConfigDict(from_attributes=True)


class ItemBase(BaseModel):
    name: str = Field(..., max_length=150)
    category_id: int
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, pattern=RARITY_PATTERN)


class ItemResponse(BaseModel):
    id: int
    name: str
    raw_name: str | None = None
    category_id: int | None = None
    category: str = ""
    role: str = "Survivor"
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    rarity: str = ""

    model_config = ConfigDict(from_attributes=True)


class _AddonResponseFields(BaseModel):
    """The fields every add-on response carries, whichever table it came from.

    `killer_id` and `item_category_id` both appear here, and exactly one is
    ever set: the two tables emit an identical payload so that a client holding
    a mixed list does not have to know which table a row came from.
    `associated_target` and `category` are derived from the owner, not stored.
    """

    id: int
    name: str
    raw_name: str | None = None
    killer_id: int | None = None
    item_category_id: int | None = None
    associated_target: str = ""
    category: str = ""
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    rarity: str = ""

    model_config = ConfigDict(from_attributes=True)


class KillerAddonBase(BaseModel):
    """Write shape for a row of `killer_addons`.

    There used to be one `AddonBase` with two nullable keys and a validator
    standing in for a `ck_addons_single_target` CHECK. Both are gone: the table
    a row is written to is what says who owns it, so `killer_id` is simply NOT
    NULL and there is nothing left to cross-check.
    """

    name: str = Field(..., max_length=150)
    killer_id: int
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, pattern=RARITY_PATTERN)


class KillerAddonResponse(_AddonResponseFields):
    pass


class ItemAddonBase(BaseModel):
    """Write shape for a row of `item_addons`. `item_category_id` is NOT NULL
    for the same reason `KillerAddonBase.killer_id` is."""

    name: str = Field(..., max_length=150)
    item_category_id: int
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, pattern=RARITY_PATTERN)


class ItemAddonResponse(_AddonResponseFields):
    pass


class OfferingBase(BaseModel):
    """Write shape for an offering.

    `category` is not accepted: it was a stored restatement of `role` that
    disagreed with it in six rows. Responses still carry it, derived.
    """

    name: str = Field(..., max_length=150)
    role: str = Field("All", pattern=r"^(Survivor|Killer|All)$")
    realm_id: int | None = None
    description: str = ""
    icon_url: str | None = Field(None, max_length=500)
    icon_local_path: str | None = Field(None, max_length=255)
    rarity: str | None = Field(None, pattern=RARITY_PATTERN)


class OfferingResponse(BaseModel):
    id: int
    name: str
    raw_name: str | None = None
    category: str = "CommonOfferings"
    role: str = "All"
    realm_id: int | None = None
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    rarity: str = ""

    model_config = ConfigDict(from_attributes=True)
