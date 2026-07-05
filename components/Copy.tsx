import { FaShareAlt } from "react-icons/fa";

import { Tooltip, TooltipRefProps } from "react-tooltip";
import { useRef } from "react";

export function Copy({ endpoint }: { endpoint: string }) {
  const tooltipRefCopy = useRef<TooltipRefProps>(null);
  return (
    <div>
      <div
        className="btn btn-md btn-primary"
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
          tooltipRefCopy.current?.open({
            anchorSelect: "#copyUrl",
            place: "left",
            content: "Trip link copied.",
          });
          setTimeout(() => {
            tooltipRefCopy.current?.close();
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
