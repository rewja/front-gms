import { useEffect } from "react";
import { createPortal } from "react-dom";

const modalRootId = "__app_modal_root";

function ensureModalRoot() {
  let root = document.getElementById(modalRootId);
  if (!root) {
    root = document.createElement("div");
    root.id = modalRootId;
    document.body.appendChild(root);
  }
  return root;
}

const ModalPortal = ({ children, lockScroll = true }) => {
  const root = ensureModalRoot();

  useEffect(() => {
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [lockScroll]);

  return createPortal(children, root);
};

export default ModalPortal;


