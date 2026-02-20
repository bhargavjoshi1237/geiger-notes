import React from "react";

const TextEditingTrait = ({ children, className = "", onKeyDown }) => {
  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div
      className={`nodrag nopan cursor-text ${className}`}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};

export default TextEditingTrait;
