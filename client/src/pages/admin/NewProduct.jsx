import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import styles from "./NewProduct.module.css";

const CATEGORIES = ["상의", "하의", "악세사리", "남성복", "여성복"];

function NewProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    price: "",
    image: "",
    category: "",
    description: "",
  });

  const [error, setError] = useState("");

  const handleUploadImage = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert("Cloudinary 설정이 필요합니다. .env 파일의 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET 값을 확인해주세요.");
      return;
    }

    if (!window.cloudinary || !window.cloudinary.openUploadWidget) {
      alert("Cloudinary 업로드 위젯을 불러오지 못했습니다. index.html에 스크립트가 추가되어 있는지 확인해주세요.");
      return;
    }

    window.cloudinary.openUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "url", "camera"],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 1,
        maxFileSize: 5000000,
        folder: "dammi-mall",
      },
      (error, result) => {
        if (!error && result.event === "success") {
          setForm((prev) => ({ ...prev, image: result.info.secure_url }));
        }
      }
    );
  };

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.data.data.user_type !== "admin") {
          navigate("/", { replace: true });
        }
      })
      .catch(() => navigate("/login", { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.sku.trim()) return "SKU를 입력해주세요.";
    if (!form.name.trim()) return "상품 이름을 입력해주세요.";
    if (!form.price || Number(form.price) <= 0) return "올바른 가격을 입력해주세요.";
    if (!form.category) return "카테고리를 선택해주세요.";
    if (!form.image) return "상품 이미지를 업로드해주세요.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      await api.post("/products", {
        sku: form.sku,
        name: form.name,
        price: Number(form.price),
        category: form.category,
        image: form.image,
        description: form.description,
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert("상품이 등록되었습니다!");
      navigate("/admin");
    } catch (err) {
      const message = err.response?.data?.message || "상품 등록에 실패했습니다.";
      setError(message);
    }
  };

  if (loading) return <div className={styles.loading}>로딩 중...</div>;

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <h1 className={styles.logo} onClick={() => navigate("/")}>Dammi</h1>
          <span className={styles.badge}>Admin</span>
        </div>
        <button className={styles.backBtn} onClick={() => navigate("/admin")}>대시보드로 돌아가기</button>
      </nav>

      <div className={styles.container}>
        <h2 className={styles.title}>새 상품 등록</h2>
        <p className={styles.subtitle}>상품 정보를 입력하고 등록하세요</p>

        {error && <p className={styles.error}>{error}</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>SKU</label>
            <input
              type="text"
              name="sku"
              placeholder="예: PROD-001"
              value={form.sku}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>상품 이름</label>
            <input
              type="text"
              name="name"
              placeholder="상품 이름을 입력하세요"
              value={form.name}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>가격 (원)</label>
            <input
              type="number"
              name="price"
              placeholder="0"
              value={form.price}
              onChange={handleChange}
              className={styles.input}
              min="0"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>카테고리</label>
            <div className={styles.categoryGroup}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.categoryBtn} ${form.category === cat ? styles.categoryActive : ""}`}
                  onClick={() => setForm({ ...form, category: cat })}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>상품 이미지</label>
            {form.image ? (
              <div className={styles.imageUploaded}>
                <div className={styles.imagePreview}>
                  <img src={form.image} alt="미리보기" />
                </div>
                <div className={styles.imageActions}>
                  <button type="button" className={styles.changeBtn} onClick={handleUploadImage}>이미지 변경</button>
                  <button type="button" className={styles.removeBtn} onClick={() => setForm({ ...form, image: "" })}>삭제</button>
                </div>
              </div>
            ) : (
              <div className={styles.uploadArea} onClick={handleUploadImage}>
                <span className={styles.uploadIcon}>📷</span>
                <p className={styles.uploadText}>클릭하여 이미지를 업로드하세요</p>
                <p className={styles.uploadHint}>JPG, PNG (최대 5MB)</p>
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              상품 설명 <span className={styles.optional}>(선택)</span>
            </label>
            <textarea
              name="description"
              placeholder="상품에 대한 설명을 입력하세요"
              value={form.description}
              onChange={handleChange}
              className={styles.textarea}
              rows={4}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={() => navigate("/admin")}>취소</button>
            <button type="submit" className={styles.submitBtn}>상품 등록</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProduct;

