import { FaShareAlt } from "react-icons/fa";

import { Tooltip } from "react-tooltip";
import { useRef } from "react";

export function Copy({ endpoint }) {
  const tooltipRefCopy = useRef(null);
  return (
    <div>
      <div
        className="btn btn-lg btn-primary"
        id="copyUrl"
        onMouseEnter={() => {
          tooltipRefCopy.current?.open({
            anchorSelect: "#copyUrl",
            place: "left",
            content: "Copy trip link.",
          });
        }}
        onClick={() => {
          const url = `${window.location.origin}/${endpoint}`;
          navigator.clipboard.writeText(url);
          tooltipRefCopy.current.open({
            anchorSelect: "#copyUrl",
            place: "left",
            content: "Trip link copied.",
          });
          setTimeout(() => {
            tooltipRefCopy.current.close();
          }, 750);
        }}
      >
        <FaShareAlt />
      </div>
      <Tooltip
        ref={tooltipRefCopy}
        // content="Copy link to trip."
        place={"left"}
        // isOpen={false}
      ></Tooltip>
    </div>
  );
}
