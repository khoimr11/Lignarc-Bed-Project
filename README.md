# Lignarc Bed Project

Website trình BOD cho dự án giường gỗ joinery của Lignarc (Amazon US & Wayfair).

- **I · Thị trường**: quy mô global, Amazon US bed frames (SmartScout), chất liệu, size, dải giá, thiết kế, màu, search demand, trend 24 tháng.
- **II · AllForWood & Bme**: doanh thu, category, dải giá, dòng chủ lực, top ASIN (Helium 10).
- **III · Deepdive giường**: 22 dòng giường, gallery, thông số, selling point, review tốt/xấu, pain point.
- **IV · Đề xuất**: Lignarc Joinery Bed (Acacia, King/Queen, $499/$459), nghiên cứu joinery, spec, định giá, unit economics, kịch bản doanh thu, roadmap.

## Xem web
Mở `index.html` trực tiếp, hoặc bật GitHub Pages: Settings → Pages → Deploy from branch `main` / root.

## Cấu trúc
```
index.html            # bản build 1 file (ảnh và dữ liệu nhúng sẵn)
build.py              # ghép src/ thành index.html
src/src.html          # template HTML/CSS/JS
src/data.json         # số liệu đã tổng hợp
src/thumbs.json       # ảnh thumbnail sản phẩm (base64)
src/img/              # ảnh render & lifestyle
src/pipeline/prep_site.py  # script tạo data.json từ dữ liệu SmartScout / Helium 10 gốc (không kèm trong repo)
```

Sửa giao diện: chỉnh `src/src.html` rồi chạy `python3 build.py`.

Nguồn dữ liệu: SmartScout export (tool Amazon Bed Frames Intelligence), Helium 10 Black Box/Xray (10/2026), crawl store Amazon AllForWood & Bme, MarketIntelo, Retail Dive, Mattress Clarity. Số liệu SmartScout và Helium 10 là ước tính.
