import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
// remove mock data; use real API via AuthContext
import { Mail, Lock, Sun, Moon, Eye, EyeOff } from "lucide-react";
import Quote from "../components/Quote";
import Logo from "../components/Logo";

const Login = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  // reserved for future demo login

  // Language dropdown for login page
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langWrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (
        showLangDropdown &&
        langWrapRef.current &&
        !langWrapRef.current.contains(e.target)
      ) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLangDropdown]);

  return (
    <div className="min-h-screen bg-light-gradient dark:bg-gray-900 flex items-center justify-center py-4 px-3 sm:py-8 sm:px-6 md:py-12 lg:px-8 transition-colors duration-300 relative">
      {/* Language selector */}
      <div
        className="absolute top-2 right-2 sm:top-4 sm:right-4"
        ref={langWrapRef}
      >
        <button
          type="button"
          onClick={() => setShowLangDropdown((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white/70 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 backdrop-blur focus:outline-none"
          title={t("lang.language", { defaultValue: "Language" })}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            className="h-4 w-4 text-gray-500"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M192 64C209.7 64 224 78.3 224 96L224 128L352 128C369.7 128 384 142.3 384 160C384 177.7 369.7 192 352 192L342.4 192L334 215.1C317.6 260.3 292.9 301.6 261.8 337.1C276 345.9 290.8 353.7 306.2 360.6L356.6 383L418.8 243C423.9 231.4 435.4 224 448 224C460.6 224 472.1 231.4 477.2 243L605.2 531C612.4 547.2 605.1 566.1 589 573.2C572.9 580.3 553.9 573.1 546.8 557L526.8 512L369.3 512L349.3 557C342.1 573.2 323.2 580.4 307.1 573.2C291 566 283.7 547.1 290.9 531L330.7 441.5L280.3 419.1C257.3 408.9 235.3 396.7 214.5 382.7C193.2 399.9 169.9 414.9 145 427.4L110.3 444.6C94.5 452.5 75.3 446.1 67.4 430.3C59.5 414.5 65.9 395.3 81.7 387.4L116.2 370.1C132.5 361.9 148 352.4 162.6 341.8C148.8 329.1 135.8 315.4 123.7 300.9L113.6 288.7C102.3 275.1 104.1 254.9 117.7 243.6C131.3 232.3 151.5 234.1 162.8 247.7L173 259.9C184.5 273.8 197.1 286.7 210.4 298.6C237.9 268.2 259.6 232.5 273.9 193.2L274.4 192L64.1 192C46.3 192 32 177.7 32 160C32 142.3 46.3 128 64 128L160 128L160 96C160 78.3 174.3 64 192 64zM448 334.8L397.7 448L498.3 448L448 334.8z" />
          </svg>
          <span className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
          <span>{i18n.language === "id" ? t("lang.id") : t("lang.en")}</span>
        </button>
        {showLangDropdown && (
          <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-1 text-sm ring-1 ring-black ring-opacity-5">
            {[
              { value: "id", label: t("lang.id") },
              { value: "en", label: t("lang.en") },
            ].map((opt) => (
              <div
                key={opt.value}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  i18n.language === opt.value
                    ? "bg-primary-50 dark:bg-primary-900/20"
                    : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  i18n.changeLanguage(opt.value);
                  localStorage.setItem("lang", opt.value);
                  setShowLangDropdown(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Theme Toggle removed for now */}

      <div className="max-w-xs w-full space-y-4 sm:max-w-sm sm:space-y-6 md:max-w-md md:space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 flex items-center justify-center rounded-full bg-primary-50 dark:bg-blue-900/30 p-4">
            <Logo size="xxlarge" className="object-contain" />
          </div>
          <h2 className="mt-4 sm:mt-5 md:mt-6 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
            GMS
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t("login.subtitle")}
          </p>
        </div>

        {/* Quote Section */}
        <div className="flex justify-center">
          <Quote className="mb-2 sm:mb-3 md:mb-4" />
        </div>

        {/* Login Form Section */}
        <div className="bg-white dark:bg-gray-800 py-4 px-4 sm:py-6 sm:px-6 md:py-8 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <form
            className="space-y-4 sm:space-y-5 md:space-y-6"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
              >
                {t("login.emailLabel")}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none z-10">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="ml-1 sm:ml-2 h-4 sm:h-5 w-px bg-gray-300 dark:bg-gray-600" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative z-0 block w-full pl-10 sm:pl-12 pr-2 sm:pr-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm sm:text-sm transition-all duration-200 ease-in-out"
                  placeholder={t("login.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
              >
                {t("login.passwordLabel")}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none z-10">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="ml-1 sm:ml-2 h-4 sm:h-5 w-px bg-gray-300 dark:bg-gray-600" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="appearance-none relative z-0 block w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm sm:text-sm transition-all duration-200 ease-in-out"
                  placeholder={t("login.passwordPlaceholder")}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center z-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  ) : (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs sm:text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg py-2 px-2 sm:px-3">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 sm:py-3 px-3 sm:px-4 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? t("login.signingIn") : t("login.signIn")}
              </button>
            </div>
          </form>

          <div className="mt-4 sm:mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 sm:px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {t("login.useCredentials")}
                </span>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-2 sm:gap-3 text-center text-xs text-gray-500 dark:text-gray-400">
              <p>{t("login.contactAdmin")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
