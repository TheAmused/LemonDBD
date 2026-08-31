# backend/tests/unit/scrapers/test_hens_map_realm_mapping.py
import pytest

from app.scrapers.maps import resolve_hens_realm


@pytest.mark.unit
class TestResolveHensRealm:
    @pytest.mark.parametrize(
        "map_name,dpath,expected_realm",
        [
            ("Blood Lodge", "Azarovs/Blood Lodge.webp", "Autohaven Wreckers"),
            ("Preschool I", "Badham/Preschool1.webp", "Springwood"),
            ("Dead Sands", "Boneyard/Dead Sands.webp", "Forsaken Boneyard"),
            ("Shattered Square", "Borgo/Shattered Square.webp", "The Decimated Borgo"),
            ("Rancid Abbatoir", "Coldwind/Rancid Abbatoir.webp", "Coldwind Farm"),
            ("Crotus Prenn Asylum", "Crotus Pen/Crotus Prenn Asylum.webp", "Disturbed Ward"),
            ("Toba Landing", "Dvarka Deepwood/Toba Landing.webp", "Dvarka Deepwood"),
            ("Coal Tower", "McMillan/Coal Tower.webp", "The Macmillan Estate"),
            ("Mount Ormond Resort", "Ormond/Mount Ormond Resort.webp", "Ormond"),
            ("Raccoon City Police Station East", "Raccoon City/RPD East.webp", "Raccoon City"),
            ("Mother's Dwelling", "Red Forest/Mothers Dwelling.webp", "Red Forest"),
            ("Trickster's Delusion", "Sleepless District/Tricksters Delusion.webp", "Sleepless District"),
            ("Grim Pantry", "Swamp/Grim Pantry.webp", "Backwater Swamp"),
            ("Family Residence", "Yamaoka/Family Residence.webp", "Yamaoka Estate"),
        ],
    )
    def test_resolves_realm_from_folder(self, map_name, dpath, expected_realm):
        assert resolve_hens_realm(map_name, dpath) == expected_realm

    @pytest.mark.parametrize(
        "map_name,expected_realm",
        [
            ("Dead Dawg Saloon", "Grave of Glenvale"),
            ("Fallen Refuge", "Withered Isle"),
            ("Freddy Fazbears Pizza", "Withered Isle"),
            ("Garden of Joy", "Withered Isle"),
            ("Greenville Square", "Withered Isle"),
            ("Lampkin Lane", "Haddonfield"),
            ("Midwich Elementary School", "Silent Hill"),
            ("The Game", "Gideon Meat Plant"),
            ("The Underground Complex", "Hawkins National Laboratory"),
            ("Treatment Theatre", "Lery's Memorial Institute"),
        ],
    )
    def test_resolves_realm_for_other_bucket_overrides(self, map_name, expected_realm):
        dpath = f"Other/{map_name}.webp"
        assert resolve_hens_realm(map_name, dpath) == expected_realm

    def test_unknown_folder_and_name_falls_back_to_folder_name(self):
        assert resolve_hens_realm("Some New Map", "BrandNewFolder/Some New Map.webp") == "BrandNewFolder"

    def test_no_folder_segment_falls_back_to_general_realm(self):
        assert resolve_hens_realm("Orphan Map", "Orphan Map.webp") == "General Realm"
