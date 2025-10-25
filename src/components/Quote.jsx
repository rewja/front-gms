import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

const Quote = ({ className = "" }) => {
  const { t } = useTranslation();
  const quoteRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // For login page, trigger immediately since it's always visible
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const fullText = t("login.quote.part1") + " " + t("login.quote.part2");
  const words = fullText.split(" ");

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        ref={quoteRef}
        className="relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
      >
        <p className="quote-text text-sm sm:text-base md:text-lg lg:text-xl font-light leading-relaxed text-center">
          {words.map((word, index) => (
            <span
              key={index}
              className={`quote-word ${isVisible ? "quote-word-visible" : ""}`}
              style={{
                animationDelay: `${index * 0.2}s`,
              }}
            >
              {word}
              {index < words.length - 1 && <span>&nbsp;</span>}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

export default Quote;


