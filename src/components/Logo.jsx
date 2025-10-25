import logoImage from '/logo.png';

const Logo = ({ className = "", size = "default" }) => {
  const sizeClasses = {
    small: "h-6 w-6",
    default: "h-8 w-8", 
    medium: "h-10 w-10",
    large: "h-12 w-12",
    xlarge: "h-16 w-16",
    xxlarge: "h-20 w-20",
    xxxlarge: "h-24 w-24"
  };

  return (
    <img 
      src={logoImage} 
      alt="GMS Logo" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
