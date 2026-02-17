import React from "react";
import ReactDOM from "react-dom/client";
import BenchmarkTaskpane from "./taskpane";
import "./taskpane.css";

/* global Office */

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    const root = ReactDOM.createRoot(
      document.getElementById("root") as HTMLElement
    );
    root.render(
      <React.StrictMode>
        <BenchmarkTaskpane />
      </React.StrictMode>
    );
  }
});
