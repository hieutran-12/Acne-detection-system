from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=("settings_",))

    cors_origins: str = "*"

    # ===== Máy chủ model ở xa (Colab + ngrok). Để trống = chạy model ngay trong backend này =====
    inference_url: str = ""  # ví dụ https://ten-cua-ban.ngrok-free.app
    inference_api_key: str = ""  # khoá bí mật dùng chung với Colab (INFER_API_KEY), gửi qua header X-API-Key
    inference_timeout: float = 60

    # ===== Model YOLO26m (ultralytics==8.4.192). Đường dẫn tương đối tính từ thư mục backend/ =====
    model_weights: str = "../model/y26m_1280/weights/best.pt"
    model_device: str = ""  # "" = tự chọn (cuda:0 nếu có), "cpu", "0"
    model_imgsz: int = 1280
    model_iou: float = 0.7
    model_max_det: int = 500
    model_end2end: bool = True
    model_half: bool = True  # chỉ có tác dụng khi chạy CUDA
    # Head end2end vẫn sinh 2 khung lồng nhau trên 1 nốt -> bỏ khung trùng (0 = tắt từng điều kiện)
    dedup_iou: float = 0.3
    dedup_contain: float = 0.7
    # Model chạy ở ngưỡng thấp CONF_FLOOR để trả về mọi khung kèm conf; FE lọc lại theo CONF_DEFAULT/thanh trượt
    conf_default: float = 0.175  # giữa vùng ổn định 0.15–0.20 khi quét 121 ảnh test (eval_conf.py, 2026-10-30)
    conf_floor: float = 0.05
    show_conf_slider: bool = True

    max_upload_mb: int = 30
    preview_max: int = 1600  # ảnh xem trước trả về cho FE (chỉ để hiển thị, model vẫn chạy trên ảnh gốc)

    # ===== Mức độ theo thang Hayashi rút gọn, áp cho TỪNG ẢNH (nửa mặt) =====
    sev_mild_max: int = 5
    sev_moderate_max: int = 20
    # Cách gộp mức độ nhiều ảnh: max = mức cao nhất trong các ảnh | mean = xếp mức theo số mụn trung bình/ảnh
    sev_aggregate: str = "max"

    llm_provider: str = "openai"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = ""
    llm_temperature: float = 0.4
    llm_max_tokens: int = 700
    llm_timeout: float = 30


settings = Settings()
