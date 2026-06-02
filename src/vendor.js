/* Vendor bundle — React + ReactDOM exposed as window globals.
   esbuild bundles React into assets/vendor.js so the app has no runtime CDN
   dependency and no in-browser Babel. The component bundle (assets/app.js)
   references the bare globals `React` / `ReactDOM`, exactly like the original
   Claude Design prototype did with CDN script tags. */
import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

window.React = React;
window.ReactDOM = { createRoot, createPortal };
