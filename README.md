# Lignarc Bed Project

Website trình BOD cho dự án giường gỗ joinery **Lignarc Kumi** (Amazon US & Wayfair). Mỗi phần là một tab riêng:

- **Tổng quan**: luận điểm, render 3D tương tác.
- **I · Thị trường**: global & kênh bán; Amazon US (tool SmartScout); chất liệu/size/thiết kế; bộ lọc sản phẩm có ảnh; từ khoá; brand; xu hướng.
- **II · AFW & Bme**: doanh thu, category, dòng chủ lực.
- **III · Giường đối thủ**: 22 dòng giường, gallery, thông số, review.
- **IV · Đề xuất**: cấu hình 3D (Geometric / Diagonal / Không đầu, 6 màu, King/Queen), sản phẩm tham khảo, giá, unit economics, kế hoạch.
- **V · Bản vẽ & lắp ráp**: lắp ráp 3D từng bước, bản vẽ kỹ thuật, BOM và phương án đóng thùng.

## Xem web
GitHub Pages: https://khoimr11.github.io/Lignarc-Bed-Project/

## Cấu trúc
```
index.html
assets/style.css   # giao diện (palette Lignarc)
assets/app.js      # tabs, chart, bảng, bộ lọc, bản vẽ SVG, BOM
assets/bed3d.js    # mô hình 3D giường Kumi (three.js), phòng ngủ, lắp ráp
assets/data.js     # số liệu tổng hợp AFW/Bme + thumbnail dự phòng
assets/market.js   # dữ liệu tool SmartScout (sản phẩm, brand, từ khoá)
img/render/        # ảnh render 3D tĩnh
```

Nguồn: SmartScout, Helium 10 (10/2026), crawl store Amazon, MarketIntelo, Retail Dive, Mattress Clarity. Số liệu là ước tính. Ảnh sản phẩm Lignarc là render 3D dựng bằng code.
