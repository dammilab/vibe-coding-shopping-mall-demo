import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import styles from "./Signup.module.css";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAllAgree = () => {
    const next = !agreements.all;
    setAgreements({
      all: next,
      terms: next,
      privacy: next,
      marketing: next,
    });
  };

  const handleAgreement = (key) => {
    const updated = { ...agreements, [key]: !agreements[key] };
    updated.all = updated.terms && updated.privacy && updated.marketing;
    setAgreements(updated);
  };

  const validate = () => {
    if (!form.name) return "이름을 입력해주세요.";
    if (!form.email) return "이메일을 입력해주세요.";
    if (!form.password) return "비밀번호를 입력해주세요.";
    if (form.password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
    if (!/(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(form.password))
      return "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.";
    if (form.password !== form.confirmPassword) return "비밀번호가 일치하지 않습니다.";
    if (!agreements.terms) return "이용약관에 동의해주세요.";
    if (!agreements.privacy) return "개인정보처리방침에 동의해주세요.";
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

    try {
      await api.post("/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        user_type: "customer",
        address: "",
      });
      alert("회원가입이 완료되었습니다!");
      navigate("/");
    } catch (err) {
      const message = err.response?.data?.message || "회원가입에 실패했습니다.";
      setError(message);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>회원가입</h1>
        <p className={styles.subtitle}>새로운 계정을 만들어 쇼핑을 시작하세요</p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label}>이름</label>
          <div className={styles.inputWrap}>
            <span className={styles.icon}>👤</span>
            <input
              type="text"
              name="name"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>이메일</label>
          <div className={styles.inputWrap}>
            <span className={styles.icon}>✉️</span>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>비밀번호</label>
          <div className={styles.inputWrap}>
            <span className={styles.icon}>🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="비밀번호를 입력하세요"
              value={form.password}
              onChange={handleChange}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <span className={styles.hint}>8자 이상, 영문, 숫자, 특수문자 포함</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>비밀번호 확인</label>
          <div className={styles.inputWrap}>
            <span className={styles.icon}>🔒</span>
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="비밀번호를 다시 입력하세요"
              value={form.confirmPassword}
              onChange={handleChange}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className={styles.agreements}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={agreements.all}
              onChange={handleAllAgree}
            />
            <span className={styles.checkLabel}>전체 동의</span>
          </label>

          <div className={styles.checkGroup}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={agreements.terms}
                onChange={() => handleAgreement("terms")}
              />
              <span className={styles.checkLabel}>이용약관 동의 (필수)</span>
              <button type="button" className={styles.viewBtn}>보기</button>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={agreements.privacy}
                onChange={() => handleAgreement("privacy")}
              />
              <span className={styles.checkLabel}>개인정보처리방침 동의 (필수)</span>
              <button type="button" className={styles.viewBtn}>보기</button>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={agreements.marketing}
                onChange={() => handleAgreement("marketing")}
              />
              <span className={styles.checkLabel}>마케팅 정보 수신 동의 (선택)</span>
            </label>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn}>회원가입</button>
      </form>
    </div>
  );
}

export default Signup;
