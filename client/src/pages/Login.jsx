import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/api";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import styles from "./Login.module.css";

function Login() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { refreshCart } = useCart();

  // 이미 유효한 토큰이 있으면 메인 페이지로 리다이렉트
  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;

    api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => navigate("/", { replace: true }))
      .catch(() => {});
  }, [navigate]);

  // 폼 입력 상태
  const [form, setForm] = useState({ email: "", password: "" });
  // 비밀번호 표시/숨김 토글
  const [showPassword, setShowPassword] = useState(false);
  // 로그인 상태 유지 체크 여부
  const [rememberMe, setRememberMe] = useState(false);
  // 에러 메시지
  const [error, setError] = useState("");

  // 입력 필드 변경 핸들러 (name 속성으로 해당 필드 업데이트)
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 로그인 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 빈 값 검증
    if (!form.email || !form.password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      // 서버에 로그인 요청 (POST /api/auth/login)
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      const { token, data } = res.data;

      // "로그인 상태 유지" 체크 시 localStorage, 아니면 sessionStorage에 저장
      if (rememberMe) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(data));
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(data));
      }

      // 로그인 성공 후 장바구니 재조회 (로그인한 유저의 이전 장바구니 복원)
      await refreshCart();

      // 로그인 성공 시 메인 페이지로 이동
      navigate("/");
    } catch (err) {
      const message = err.response?.data?.message || "로그인에 실패했습니다.";
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={logout} />

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <h2 className={styles.title}>로그인</h2>
          <p className={styles.subtitle}>계정에 로그인하여 쇼핑을 시작하세요</p>

          {/* 에러 메시지 표시 */}
          {error && <p className={styles.error}>{error}</p>}

          {/* 이메일 입력 */}
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

          {/* 비밀번호 입력 (보기/숨기기 토글 포함) */}
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
          </div>

          {/* 로그인 상태 유지 + 비밀번호 찾기 */}
          <div className={styles.options}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <span>로그인 상태 유지</span>
            </label>
            <button type="button" className={styles.forgotBtn}>비밀번호 찾기</button>
          </div>

          {/* 로그인 버튼 */}
          <button type="submit" className={styles.loginBtn}>로그인</button>

          {/* 소셜 로그인 구분선 */}
          <div className={styles.divider}>
            <span>또는</span>
          </div>

          {/* 소셜 로그인 버튼들 */}
          <button type="button" className={styles.socialBtn}>
            <span className={styles.socialIcon}>G</span>
            Google로 로그인
          </button>

          <button type="button" className={styles.socialBtn}>
            <span className={styles.socialIcon}>f</span>
            Facebook으로 로그인
          </button>

          <button type="button" className={`${styles.socialBtn} ${styles.appleBtn}`}>
            <span className={styles.socialIcon}></span>
            Apple로 로그인
          </button>

          {/* 회원가입 페이지 링크 */}
          <p className={styles.signupLink}>
            계정이 없으신가요? <Link to="/signup">회원가입</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
