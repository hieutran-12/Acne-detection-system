# Báo cáo: đếm mụn bằng YOLO26m trên ACNE04v2

Cập nhật 30/10/2026. Notebook đi kèm: `acne_yolo26m_1280.ipynb` (Colab) và `acne_kaggle_resume.ipynb` (Kaggle).

Em lọc 6 model rồi chọn YOLO26m, thấy mụn quá nhỏ so với 640 nên tăng lên 1280, train 91 epoch và dừng sớm khi model bắt đầu overfit. Trên tập test, model đếm lệch trung bình khoảng 8 nốt mỗi ảnh và xếp đúng mức độ 80% số ảnh. Con số này chưa cao, một phần vì dữ liệu nhiễu hơn em tưởng: có những ảnh giống hệt nhau mà nhãn lệch nhau cả chục nốt.

## 1. Bài toán

Em cần một model phát hiện mụn trên ảnh chụp cận da mặt để đếm số nốt, rồi từ đó xếp mức nhẹ, trung bình hoặc nặng. Chỉ có 1 lớp là `acne`, không phân biệt loại mụn.

Vì mục tiêu cuối là đếm nên em ưu tiên chỉ số theo thứ tự: MAE số đếm, rồi recall, rồi mới đến mAP50-95. Mức độ theo thang Hayashi, vốn đếm trên nửa mặt: 0-5 nhẹ, 6-20 vừa, 21-50 nặng, trên 50 rất nặng. Em gộp hai mức cuối, còn lại 3 mức.

Môi trường train là GPU T4 trên Colab free và Kaggle, `ultralytics==8.4.192`. Suy luận chạy trên RTX 3050 4 GB.

## 2. Dữ liệu: khó nhất là ở đây

Em dùng ACNE04v2 của Torus AI, bản gán nhãn lại từ ACNE04 gốc, gồm 1.204 ảnh và 32.443 nốt. Nhãn gốc là hình tròn (tâm và bán kính), em đổi thành khung vuông cho YOLO rồi chia ngẫu nhiên 80/10/10.

| Tập | Số ảnh | Số nốt | TB/ảnh | Trung vị | Nhiều nhất |
|---|---:|---:|---:|---:|---:|
| train | 963 | 25.521 | 26,5 | 19 | 232 |
| val | 120 | 3.366 | 28,1 | 17 | 215 |
| test | 121 | 3.507 | 29,0 | 21 | 434 |

Đầu tiên là ảnh trùng. Lúc lập kế hoạch em chỉ thấy 2 cặp khung trùng nên tưởng nhãn khá sạch, nhưng so md5 từng file thì ra 36 cặp ảnh giống hệt nhau từng byte, và 35 cặp trong đó có số nhãn khác nhau. 9 cặp còn nằm ở hai mức độ khác nhau theo tên file gốc. Ví dụ `levle2_96` (train) ghi 97 nốt còn ảnh trùng `levle2_70` (val) ghi 60 nốt, `levle0_172` (train) ghi 45 nốt còn `levle1_283` (test) ghi 15 nốt, `levle1_129` ghi 19 nốt còn `levle1_206` ghi 39 nốt dù cả hai đều ở train, `levle1_138` (train) ghi 54 nốt còn `levle1_460` (val) ghi 37 nốt.

Cùng một ảnh mà lần ghi 97 nốt, lần ghi 60 nốt thì model khó mà đếm khớp nhãn được, nên sai số 8 nốt mỗi ảnh ở cuối báo cáo một phần là sai số của chính nhãn.

12 trong 36 cặp đó còn nằm vắt qua hai tập, tức 7 ảnh val và 5 ảnh test cũng có trong train. Em chạy lại đánh giá sau khi bỏ các ảnh này: MAE val đổi từ 8,63 thành 8,91, test từ 7,98 thành 7,97, nên rò rỉ không làm kết quả đẹp lên đáng kể. Ngoài ra có 59 cặp gần trùng theo perceptual hash em chưa kiểm tra bằng mắt, và bộ dữ liệu không có ID bệnh nhân nên cũng không biết có nhiều ảnh của cùng một người nằm ở hai tập hay không.

Nhãn cũng có chỗ thiếu, chỗ sai. Xem kết quả trên 3 ảnh test thì nhiều chỗ model báo mà nhãn không có lại trông giống nốt mụn thật, ví dụ vùng trán của `levle1_186`. Ảnh `levle1_175` có một nhãn nằm hẳn ngoài vùng da. Vì vậy precision đo được có thể thấp hơn thực tế.

Dữ liệu còn lệch nữa: theo tên file gốc, ảnh mức nặng nhất chỉ có 22 trên 1.204 ảnh, còn số nốt mỗi ảnh thì chênh rất lớn, có ảnh tới 434 nốt. Mụn cũng quá nhỏ, chuyện này quyết định độ phân giải nên em để riêng ở mục 4.

Model hiện tại vẫn train trên bộ dữ liệu nguyên như vậy, nên các số bên dưới đều phải đọc với giả định nhãn không hoàn hảo.

## 3. Lọc model

Em chạy 6 model, mỗi model 30 epoch ở imgsz 640, cùng seed 42, rồi so trên val. MAE tính ở conf 0,25.

| Model | mAP50 | mAP50-95 | Precision | Recall | Std mAP 5 epoch cuối | MAE |
|---|---:|---:|---:|---:|---:|---:|
| **yolo26m** | **0,4256** | **0,1572** | **0,5234** | **0,4287** | 0,0017 | 10,28 |
| yolo11m | 0,4181 | 0,1508 | 0,5080 | 0,4227 | 0,0060 | 10,04 |
| yolo26s | 0,4008 | 0,1490 | 0,5038 | 0,3948 | 0,0033 | 9,82 |
| yolo11s | 0,4040 | 0,1444 | 0,4741 | 0,4253 | 0,0042 | 11,11 |
| yolo11n | 0,3345 | 0,1188 | 0,4544 | 0,3714 | 0,0027 | 13,52 |
| yolo26n | 0,3346 | 0,1179 | 0,4233 | 0,3794 | 0,0003 | 12,82 |

Em chọn yolo26m vì nó đứng đầu cả mAP, precision lẫn recall trong vòng này và dao động ít hơn yolo11m ở mấy epoch cuối. Ultralytics cũng công bố YOLO26 có STAL, kỹ thuật gán nhãn giúp giữ được vị trí dương cho vật thể nhỏ, mà bài này toàn vật thể nhỏ.

Tuy vậy chênh lệch giữa 26m, 11m và 26s khá nhỏ, chỉ có 1 seed nên có thể là nhiễu, và yolo26s còn có MAE thấp hơn ở vòng này. Ultralytics cũng không đưa con số riêng cho vật thể nhỏ, nên STAL chỉ là lý do để em thử thôi. Chắc chắn nhất là hai model n yếu hẳn, và cả 6 model đều có epoch tốt nhất ở 27-30 trên 30, tức là chưa hội tụ.

## 4. Vì sao 640 không đủ

Sau vòng lọc, MAE vẫn khoảng 10 nốt trên trung bình 28 nốt mỗi ảnh, nên em quay lại xem kích thước nhãn. Ảnh gốc khoảng 3112×3456, mụn rộng chừng 40 px, nhìn rất rõ. Nhưng khi thu về 640 thì một nửa số mụn nhỏ hơn 8 px, mà 8 px là bước lưới nhỏ nhất của YOLO. Nhiều nốt mụn còn nhỏ hơn một ô đặc trưng, model gần như không còn gì để nhìn.

Tỉ lệ khung có cạnh ngắn dưới 8 px theo imgsz:

| Tập | 640 | 960 | 1280 | Trung vị cạnh ngắn ở 640 | ở 1280 |
|---|---:|---:|---:|---:|---:|
| train | 52,4% | 21,0% | 6,9% | 7,8 px | 15,6 px |
| val | 47,3% | 15,9% | 4,1% | 8,1 px | 16,3 px |
| test | 59,6% | 25,0% | 7,5% | 7,0 px | 14,1 px |

Ban đầu em định so 640 với 960, rồi định so 960 với 1280. Sau đó tính lại thấy chỉ riêng phép so sánh đã tốn khoảng 4,5 tiếng GPU, gần bằng số giờ tiết kiệm được nếu 960 thắng, trong khi số liệu đã nghiêng rõ về 1280, nên em train thẳng ở 1280 và giữ `scale=0.3` để augment không thu mụn nhỏ thêm nữa. Em quyết định dựa trên thống kê kích thước, chưa chạy thử 960 để so.

So với vòng lọc (640, 30 epoch), `best.pt` ở 1280 tăng rõ trên val: mAP50 từ 0,4256 lên 0,5132, mAP50-95 từ 0,1572 lên 0,1974, precision từ 0,5234 lên 0,6152, recall từ 0,4287 lên 0,4837. Hai bên còn khác nhau về số epoch và augment nên phần tăng này không hẳn do độ phân giải.

Riêng MAE thì chưa tốt lên ngay: ở cùng conf 0,25, model 1280 có MAE 10,53 sau khi lọc khung trùng, không hơn gì 10,28 của vòng lọc. Phải chọn lại ngưỡng ở mục 8 thì MAE mới xuống 8,63.

## 5. Siêu tham số

| Tham số | Giá trị | Lý do |
|---|---|---|
| `imgsz` | 1280 | xem mục 4 |
| `epochs`, `patience` | 100, 30 | 30 epoch chưa hội tụ, cần early stopping để cắt khi bão hoà |
| `optimizer`, `lr0` | AdamW, 0,002 | cố định vì `auto` sẽ đổi sang MuSGD khi quá 10.000 iteration |
| `cos_lr`, `lrf` | True, 0,01 | LR giảm dần cho mấy epoch cuối đỡ dao động |
| `batch` | 4 | giới hạn VRAM của T4 ở 1280, gradient tích luỹ tới nbs 64 |
| `max_det` | 500 | có ảnh 434 nốt, vượt mặc định 300 |
| `close_mosaic` | 15 | tắt mosaic ở cuối để model quen ảnh nguyên như lúc suy luận |
| `hsv_h`, `hsv_s` | 0,005, 0,5 | màu đỏ là dấu hiệu viêm nên hạn chế đổi màu |
| `degrees` | 5 | mặt thường hơi nghiêng khi chụp |
| `scale` | 0,3 | giảm từ 0,5 để không thu mụn nhỏ thêm |
| `fliplr`, `flipud` | 0,5, 0 | mặt đối xứng trái phải, còn lật ngược thì không có thật |
| `mixup`, `copy_paste` | 0, 0 | trộn hai khuôn mặt chỉ thêm nhiễu cho bài đếm |

Phần augment em chỉnh theo hiểu biết về ảnh da, chưa thử so sánh riêng từng tham số.

## 6. Chống overfit

Em dùng `weight_decay`, LR giảm dần, augment vừa phải và early stopping với `patience=30`, rồi lấy `best.pt`.

Lúc lọc model em từng so loss train với loss val và ra số âm, sau đó mới hiểu là không so được: loss train tính trên ảnh có augment, loss val thì không. Phải chạy val trên chính tập train, không augment, rồi so mAP hai bên mới đúng. Kết quả các checkpoint:

| Checkpoint | mAP50-95 train | mAP50-95 val | Chênh lệch | Recall val |
|---|---:|---:|---:|---:|
| `epoch20.pt` | 0,1871 | 0,1660 | 0,0211 | 0,415 |
| `epoch40.pt` | 0,2375 | 0,1916 | 0,0459 | 0,474 |
| `epoch60.pt` (chính là `best.pt`) | 0,2929 | 0,1974 | 0,0955 | 0,484 |
| `epoch80.pt` | 0,3458 | 0,1879 | 0,1578 | 0,491 |
| `last.pt` (epoch 91) | 0,3625 | 0,1855 | 0,1771 | 0,489 |

Tới epoch 60, train và val cùng tăng nên chênh lệch rộng ra là bình thường. Sau đó train vẫn tăng còn val tụt, đó là overfit. Với bộ nhãn nhiễu như mục 2, em nghĩ một phần là model học thuộc cả lỗi của nhãn.

Early stopping chạy đúng ý: epoch tốt nhất là 61, chờ thêm 30 epoch không tốt hơn thì dừng ở epoch 91, chưa tới 100. Nhờ lấy `best.pt` nên model được mAP50-95 0,1974 thay vì 0,1855 của epoch cuối. `val/box_loss` thấp nhất ở epoch 41 (1,82) rồi tăng dần lên 1,93 cũng đi cùng hướng này.

Chênh lệch ở `best.pt` vẫn gần 0,10 nên overfit chưa hết hẳn.

## 7. Train trên Colab rồi chuyển sang Kaggle

Colab free chỉ có khoảng 5 tiếng GPU mỗi ngày, không đủ yên tâm cho một run dài. Em viết sẵn cơ chế tự dừng trước khi hết giờ, lưu `last.pt` sau mỗi epoch, và resume đúng lịch LR ở phiên sau. Khi đổi máy, đường dẫn trong checkpoint bị sai nên có thêm hàm `retarget_ckpt` để sửa. Phần train tiếp trên Kaggle tách thành notebook riêng để chạy nền được.

Theo mốc thời gian trong checkpoint, epoch đầu xong lúc 10:08 và run kết thúc lúc 15:50 (giờ UTC) ngày 29/10, mỗi epoch khoảng 130 đến 160 giây. Nhanh hơn nhiều so với ước tính 8-10 tiếng ban đầu.

Theo log, đoạn epoch 72-78 bị resume nhiều lần liên tiếp nên `results.csv` có 5 epoch (73-77) bị ghi hai dòng. Đoạn này nằm sau epoch tốt nhất nên không ảnh hưởng đến `best.pt`, nhưng khi vẽ biểu đồ cần lọc trùng theo cột `epoch`.

## 8. Khung trùng và chọn ngưỡng

Khi đưa model vào web, em thấy có nốt bị đếm hai lần. YOLO26 không dùng NMS, nhưng head end2end vẫn sinh hai khung lồng nhau trên cùng một nốt, nên chỉnh `iou` không có tác dụng gì. Em thêm một bước lọc: duyệt theo conf giảm dần, bỏ khung có IoU từ 0,3 trở lên hoặc nằm ít nhất 70% trong một khung conf cao hơn. Ở 3 ảnh test xem kỹ, số đếm giảm từ 91 xuống 70, cả 21 khung bị bỏ đều là khung sai, số khung đúng giữ nguyên và precision tăng từ 0,57 lên 0,74. Trên toàn bộ val ở conf 0,175, số khung giảm từ 4.104 xuống 2.942. Khung đứng riêng thì em giữ lại, vì nhãn còn thiếu nên khung không khớp nhãn vẫn có thể là mụn thật.

Sau đó quét ngưỡng conf:

| conf | MAE val | Khớp mức val | MAE test | Khớp mức test |
|---:|---:|---:|---:|---:|
| 0,10 | 11,93 | 72% | 10,68 | 79% |
| 0,15 | 9,18 | 79% | 8,08 | 81% |
| **0,175** | **8,63** | **80%** | **7,98** | **80%** |
| 0,20 | 9,02 | 78% | 8,50 | 79% |
| 0,25 | 10,53 | 72% | 10,53 | 64% |
| 0,30 | 12,72 | 64% | 13,29 | 55% |

Ngưỡng mặc định 0,25 của Ultralytics đếm thiếu khoảng 9 nốt mỗi ảnh, nên em dùng 0,175.

Chỗ này em làm sai quy trình: đáng lẽ chọn ngưỡng trên val và chỉ đụng tới test một lần, nhưng em lại quét trên test trước. Sau này quét lại trên val cũng ra 0,175 nên ngưỡng không phải đổi, nhưng tập test không còn sạch hoàn toàn. Các số test trong báo cáo vì thế chỉ nên xem để tham khảo, số val mới là số chọn cấu hình.

## 9. Kết quả cuối

Cấu hình: `best.pt`, imgsz 1280, conf 0,175, có lọc khung trùng. Precision và recall tính ở IoU từ 0,5.

| Chỉ số | Val (120 ảnh) | Test (121 ảnh) |
|---|---:|---:|
| MAE (nốt/ảnh) | 8,63 | 7,98 |
| Lệch trung bình (nốt/ảnh) | -3,53 | -2,96 |
| Tương quan số đếm với nhãn | 0,84 | 0,95 |
| Precision | 0,59 | 0,61 |
| Recall | 0,52 | 0,54 |
| F1 | 0,55 | 0,57 |
| Khớp mức độ | 80% | 80% |
| Lệch không quá 1 mức | 100% | 100% |

Không có ảnh nào bị xếp nhầm giữa nhẹ và nặng. Model đếm khá sát ở ảnh ít mụn và kém dần ở ảnh dày mụn:

| Nhóm theo nhãn | Số ảnh val | MAE val | Lệch val | Số ảnh test | MAE test | Lệch test |
|---|---:|---:|---:|---:|---:|---:|
| Nhẹ | 17 | 2,53 | +1,47 | 13 | 2,23 | +1,77 |
| Trung bình | 52 | 3,79 | +0,06 | 47 | 4,30 | +0,21 |
| Nặng | 51 | 15,61 | -8,86 | 61 | 12,05 | -6,41 |

Recall theo kích thước cho thấy mụn nhỏ vẫn là điểm yếu nhất, ngay cả ở 1280:

| Cạnh ngắn ở 1280 | Số nhãn val | Recall val | Số nhãn test | Recall test |
|---|---:|---:|---:|---:|
| Dưới 8 px | 137 | 0,11 | 262 | 0,09 |
| 8-16 px | 1.454 | 0,51 | 1.828 | 0,51 |
| 16-32 px | 1.393 | 0,58 | 1.239 | 0,67 |
| Trên 32 px | 382 | 0,47 | 178 | 0,69 |

Tốc độ trên RTX 3050 ở FP16 khoảng 70 ms cho phần model, khoảng 0,65 giây mỗi request tính cả đọc ảnh và tạo ảnh xem trước.

## 10. Hạn chế và việc tiếp theo

Model này mới là công cụ tham khảo, chưa được bác sĩ kiểm chứng và chưa thử trên ảnh điện thoại thật. Mức độ cũng chỉ dựa trên số nốt, không xét loại mụn hay mức viêm.

Nếu làm tiếp, em sẽ ưu tiên theo thứ tự này:

1. Làm sạch dữ liệu trước: bỏ ảnh trùng, chia lại các tập, nhờ bác sĩ soát các cặp ảnh có nhãn lệch nhau. Em nghĩ việc này lợi nhất vì nhãn đang kéo kết quả xuống nhiều.
2. Thu thêm ảnh dày mụn và ảnh mức nặng, nhóm đang đếm thiếu nhiều nhất.
3. Thử train trên ô ảnh (tiling) cho nhóm mụn nhỏ.
4. Chạy thêm 2 seed và một run 960 để so cho có số liệu.
5. Sau khi chia lại dữ liệu, chốt cấu hình trên val rồi chạy test đúng một lần.

## Nguồn

- Ultralytics, YOLO26: https://docs.ultralytics.com/models/yolo26/
- Ultralytics, End-to-End Detection: https://docs.ultralytics.com/guides/end2end-detection
- Ultralytics, YOLO26 Training Recipe: https://docs.ultralytics.com/guides/yolo26-training-recipe
- Wu et al., Joint Acne Image Grading and Counting via Label Distribution Learning, ICCV 2019.
- Gazeau et al., AcneAI: A New Acne Severity Assessment Method Using Digital Images and Deep Learning, MICCAI 2024.
- Hayashi et al., Establishment of grading criteria for acne severity, Journal of Dermatology, 2008.
