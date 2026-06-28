from __future__ import annotations

from core.province_mapping import VALID_PROVINCES_34, normalize_province


def test_valid_34_provinces() -> None:
    assert len(VALID_PROVINCES_34) == 34
    for province in VALID_PROVINCES_34:
        assert normalize_province(province) == (province, False)


def test_legacy_to_new_binh_duong() -> None:
    assert normalize_province("Bình Dương") == ("TP. Hồ Chí Minh", True)


def test_alias_thua_thien_hue() -> None:
    assert normalize_province("Thừa Thiên Huế") == ("Huế", True)


def test_alias_tphcm_variants() -> None:
    assert normalize_province("TP HCM") == ("TP. Hồ Chí Minh", True)
    assert normalize_province("TPHCM") == ("TP. Hồ Chí Minh", True)
    assert normalize_province("Sài Gòn") == ("TP. Hồ Chí Minh", True)


def test_invalid_province() -> None:
    assert normalize_province("Atlantis") == (None, False)


def test_normalize_without_diacritics() -> None:
    assert normalize_province("Binh Duong") == ("TP. Hồ Chí Minh", True)
