from __future__ import annotations

import re
import unicodedata

# core/province_mapping.py — chuẩn NQ 202/2025/QH15 (12/6/2025)

# 34 đơn vị hợp lệ (6 thành phố + 28 tỉnh)
VALID_PROVINCES_34 = {
    "Hà Nội",
    "Huế",
    "Hải Phòng",
    "Đà Nẵng",
    "Cần Thơ",
    "TP. Hồ Chí Minh",
    "Lai Châu",
    "Điện Biên",
    "Sơn La",
    "Lạng Sơn",
    "Quảng Ninh",
    "Thanh Hóa",
    "Nghệ An",
    "Hà Tĩnh",
    "Cao Bằng",
    "Tuyên Quang",
    "Lào Cai",
    "Thái Nguyên",
    "Phú Thọ",
    "Bắc Ninh",
    "Hưng Yên",
    "Ninh Bình",
    "Quảng Trị",
    "Quảng Ngãi",
    "Gia Lai",
    "Khánh Hòa",
    "Lâm Đồng",
    "Đắk Lắk",
    "Đồng Nai",
    "Tây Ninh",
    "Vĩnh Long",
    "Đồng Tháp",
    "Cà Mau",
    "An Giang",
}

# Tên cũ (63) -> tên mới (34). Tên giữ nguyên ánh xạ về chính nó.
LEGACY_TO_NEW = {
    # --- 11 đơn vị giữ nguyên ---
    "Hà Nội": "Hà Nội",
    "Huế": "Huế",
    "Thừa Thiên Huế": "Huế",
    "Lai Châu": "Lai Châu",
    "Điện Biên": "Điện Biên",
    "Sơn La": "Sơn La",
    "Lạng Sơn": "Lạng Sơn",
    "Quảng Ninh": "Quảng Ninh",
    "Thanh Hóa": "Thanh Hóa",
    "Nghệ An": "Nghệ An",
    "Hà Tĩnh": "Hà Tĩnh",
    "Cao Bằng": "Cao Bằng",
    # --- Miền Bắc hợp nhất ---
    "Hà Giang": "Tuyên Quang",
    "Tuyên Quang": "Tuyên Quang",
    "Yên Bái": "Lào Cai",
    "Lào Cai": "Lào Cai",
    "Bắc Kạn": "Thái Nguyên",
    "Thái Nguyên": "Thái Nguyên",
    "Vĩnh Phúc": "Phú Thọ",
    "Hòa Bình": "Phú Thọ",
    "Phú Thọ": "Phú Thọ",
    "Bắc Giang": "Bắc Ninh",
    "Bắc Ninh": "Bắc Ninh",
    "Thái Bình": "Hưng Yên",
    "Hưng Yên": "Hưng Yên",
    "Hải Dương": "Hải Phòng",
    "Hải Phòng": "Hải Phòng",
    "Hà Nam": "Ninh Bình",
    "Nam Định": "Ninh Bình",
    "Ninh Bình": "Ninh Bình",
    # --- Miền Trung & Tây Nguyên hợp nhất ---
    "Quảng Bình": "Quảng Trị",
    "Quảng Trị": "Quảng Trị",
    "Quảng Nam": "Đà Nẵng",
    "Đà Nẵng": "Đà Nẵng",
    "Kon Tum": "Quảng Ngãi",
    "Quảng Ngãi": "Quảng Ngãi",
    "Bình Định": "Gia Lai",
    "Gia Lai": "Gia Lai",
    "Ninh Thuận": "Khánh Hòa",
    "Khánh Hòa": "Khánh Hòa",
    "Đắk Nông": "Lâm Đồng",
    "Bình Thuận": "Lâm Đồng",
    "Lâm Đồng": "Lâm Đồng",
    "Phú Yên": "Đắk Lắk",
    "Đắk Lắk": "Đắk Lắk",
    # --- Miền Nam hợp nhất ---
    "Bà Rịa - Vũng Tàu": "TP. Hồ Chí Minh",
    "Bình Dương": "TP. Hồ Chí Minh",
    "TP. Hồ Chí Minh": "TP. Hồ Chí Minh",
    "Bình Phước": "Đồng Nai",
    "Đồng Nai": "Đồng Nai",
    "Long An": "Tây Ninh",
    "Tây Ninh": "Tây Ninh",
    "Sóc Trăng": "Cần Thơ",
    "Hậu Giang": "Cần Thơ",
    "Cần Thơ": "Cần Thơ",
    "Bến Tre": "Vĩnh Long",
    "Trà Vinh": "Vĩnh Long",
    "Vĩnh Long": "Vĩnh Long",
    "Tiền Giang": "Đồng Tháp",
    "Đồng Tháp": "Đồng Tháp",
    "Bạc Liêu": "Cà Mau",
    "Cà Mau": "Cà Mau",
    "Kiên Giang": "An Giang",
    "An Giang": "An Giang",
}


def _fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip().lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.replace("đ", "d")
    text = re.sub(r"[.\-_/]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    for prefix in ("thanh pho ", "tinh ", "tp "):
        if text.startswith(prefix):
            text = text[len(prefix) :].strip()
    return text


_NORMALIZED_LOOKUP = {_fold(name): target for name, target in LEGACY_TO_NEW.items()}
_NORMALIZED_LOOKUP.update({_fold(name): name for name in VALID_PROVINCES_34})
_ALIASES = {
    "hcm": "TP. Hồ Chí Minh",
    "tphcm": "TP. Hồ Chí Minh",
    "tp hcm": "TP. Hồ Chí Minh",
    "sai gon": "TP. Hồ Chí Minh",
    "ho chi minh": "TP. Hồ Chí Minh",
    "br vt": "TP. Hồ Chí Minh",
    "vung tau": "TP. Hồ Chí Minh",
    "ba ria vung tau": "TP. Hồ Chí Minh",
    "dak lak": "Đắk Lắk",
    "daklak": "Đắk Lắk",
    "dac lac": "Đắk Lắk",
    "dac lak": "Đắk Lắk",
    "thua thien hue": "Huế",
}


def normalize_province(raw: str) -> tuple[str | None, bool]:
    """Return (normalized_province, was_converted).

    Returns None when the input is neither one of the 34 valid province names nor a
    legacy/alias name that can be mapped without guessing.
    """
    if not raw or not raw.strip():
        return None, False

    folded = _fold(raw)
    normalized = _ALIASES.get(folded) or _NORMALIZED_LOOKUP.get(folded)
    if normalized is None:
        return None, False

    return normalized, folded != _fold(normalized)
