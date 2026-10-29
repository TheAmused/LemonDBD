# backend/tests/unit/streaks/test_id_please_roster.py
import pytest
from sqlalchemy.orm import Session
from app.models import Perk, User, UserCharacterOwnership, UserPerkOwnership
from app.services.id_please.roster import Roster, always_on_perk_counts, load_roster, to_ids, to_positions
from tests.unit.conftest import make_killer, make_survivor


@pytest.mark.unit
class TestPositions:
    def test_position_is_index_in_the_sorted_list(self) -> None:
        assert to_positions([4, 10, 2], [2, 4, 7, 10]) == [1, 3, 0]

    def test_missing_id_lands_on_next_higher_neighbour(self) -> None:
        assert to_positions([5], [2, 4, 7, 10]) == [2]

    def test_id_above_the_end_is_clamped_to_the_last_entry(self) -> None:
        assert to_positions([99], [2, 4, 7]) == [2]

    def test_empty_roster_is_rejected(self) -> None:
        with pytest.raises(ValueError):
            to_positions([1], [])

    def test_to_ids_is_the_inverse(self) -> None:
        owned = [2, 4, 7, 10]
        assert to_ids(to_positions([4, 10], owned), owned) == [4, 10]


@pytest.mark.unit
class TestRosterValue:
    ROSTER = Roster((1, 2), (5, 6, 7), (10, 11, 12, 13), (20, 21, 22, 23, 24))

    def test_side_accessors(self) -> None:
        assert self.ROSTER.characters("killer") == (1, 2)
        assert self.ROSTER.characters("survivor") == (5, 6, 7)
        assert self.ROSTER.perks("killer") == (10, 11, 12, 13)
        assert self.ROSTER.perks("survivor") == (20, 21, 22, 23, 24)

    def test_sizes(self) -> None:
        s = self.ROSTER.sizes
        assert (s.killer_characters, s.killer_perks, s.survivor_characters, s.survivor_perks) == (2, 4, 3, 5)

    def test_fingerprint_changes_with_any_id(self) -> None:
        other = Roster((1, 3), (5, 6, 7), (10, 11, 12, 13), (20, 21, 22, 23, 24))
        assert self.ROSTER.fingerprint != other.fingerprint
        assert self.ROSTER.fingerprint.startswith("2/4/3/5:")

    def test_fingerprint_is_stable(self) -> None:
        assert self.ROSTER.fingerprint == Roster((1, 2), (5, 6, 7), (10, 11, 12, 13), (20, 21, 22, 23, 24)).fingerprint


def perk(db: Session, name: str, role: str, **owner: object) -> Perk:
    row = Perk(name=name, role=role, **owner)
    db.add(row)
    db.flush()
    return row


@pytest.mark.unit
class TestLoadRoster:
    def test_characters_without_ownership_rows_count_as_owned(self, db_session: Session, sample_user: User) -> None:
        k1, k2 = make_killer(db_session, "K1"), make_killer(db_session, "K2")
        s1 = make_survivor(db_session, "S1")
        roster = load_roster(sample_user.id)
        assert roster.killer_ids == tuple(sorted((k1.id, k2.id)))
        assert roster.survivor_ids == (s1.id,)

    def test_disowned_and_disabled_characters_are_left_out(self, db_session: Session, sample_user: User) -> None:
        k1, k2, k3 = (make_killer(db_session, n) for n in ("K1", "K2", "K3"))
        k3.is_disabled = True
        db_session.add(UserCharacterOwnership(user_id=sample_user.id, killer_id=k2.id, is_owned=False))
        db_session.flush()
        assert load_roster(sample_user.id).killer_ids == (k1.id,)

    def test_other_users_ownership_does_not_matter(self, db_session: Session, sample_user: User) -> None:
        k1 = make_killer(db_session, "K1")
        other = User(login="other", username="other", email="o@test.com", password_hash="x")
        db_session.add(other)
        db_session.flush()
        db_session.add(UserCharacterOwnership(user_id=other.id, killer_id=k1.id, is_owned=False))
        db_session.flush()
        assert load_roster(sample_user.id).killer_ids == (k1.id,)

    def test_lists_are_sorted_by_id(self, db_session: Session, sample_user: User) -> None:
        make_killer(db_session, "Z", id=30)
        make_killer(db_session, "A", id=10)
        assert load_roster(sample_user.id).killer_ids == (10, 30)

    def test_general_perks_are_always_unlocked(self, db_session: Session, sample_user: User) -> None:
        owner = make_killer(db_session, "K1")
        db_session.add(UserCharacterOwnership(user_id=sample_user.id, killer_id=owner.id, is_owned=False))
        general = perk(db_session, "General", "Killer")
        counterpart = perk(db_session, "Counterpart", "Killer", killer_id=owner.id, is_generic_counterpart=True)
        licensed = perk(db_session, "Licensed", "Killer", killer_id=owner.id)
        assert load_roster(sample_user.id).killer_perk_ids == tuple(sorted((general.id, counterpart.id)))
        assert licensed.id not in load_roster(sample_user.id).killer_perk_ids

    def test_licensed_perk_follows_its_owner_unless_set_explicitly(self, db_session: Session, sample_user: User) -> None:
        owner = make_survivor(db_session, "S1")
        kept = perk(db_session, "Kept", "Survivor", survivor_id=owner.id)
        assert load_roster(sample_user.id).survivor_perk_ids == (kept.id,)
        db_session.add(UserPerkOwnership(user_id=sample_user.id, perk_id=kept.id, is_unlocked=False))
        db_session.flush()
        assert load_roster(sample_user.id).survivor_perk_ids == ()

    def test_explicit_unlock_beats_a_disowned_owner(self, db_session: Session, sample_user: User) -> None:
        owner = make_survivor(db_session, "S1")
        licensed = perk(db_session, "Licensed", "Survivor", survivor_id=owner.id)
        db_session.add(UserCharacterOwnership(user_id=sample_user.id, survivor_id=owner.id, is_owned=False))
        db_session.add(UserPerkOwnership(user_id=sample_user.id, perk_id=licensed.id, is_unlocked=True))
        db_session.flush()
        assert load_roster(sample_user.id).survivor_perk_ids == (licensed.id,)

    def test_disabled_perks_and_other_role_are_left_out(self, db_session: Session, sample_user: User) -> None:
        live = perk(db_session, "Live", "Survivor")
        off = perk(db_session, "Off", "Survivor")
        off.is_disabled = True
        perk(db_session, "Killer one", "Killer")
        db_session.flush()
        roster = load_roster(sample_user.id)
        assert roster.survivor_perk_ids == (live.id,)

    def test_always_on_counts_general_and_counterparts_only(self, db_session: Session) -> None:
        owner = make_killer(db_session, "K1")
        perk(db_session, "General", "Killer")
        perk(db_session, "Counterpart", "Killer", killer_id=owner.id, is_generic_counterpart=True)
        perk(db_session, "Licensed", "Killer", killer_id=owner.id)
        disabled = perk(db_session, "Gone", "Killer")
        disabled.is_disabled = True
        perk(db_session, "Surv general", "Survivor")
        db_session.flush()
        assert always_on_perk_counts() == {"killer": 2, "survivor": 1}
