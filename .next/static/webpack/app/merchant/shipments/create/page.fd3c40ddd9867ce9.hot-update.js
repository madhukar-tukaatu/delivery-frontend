/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/merchant/shipments/create/page",{

/***/ "(app-pages-browser)/./node_modules/.pnpm/next@14.2.35_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?modules=%7B%22request%22%3A%22C%3A%5C%5CUsers%5C%5CHP%5C%5CDownloads%5C%5Ccourier-dms%5C%5Cfrontend%5C%5Csrc%5C%5Capp%5C%5Cmerchant%5C%5Cshipments%5C%5Ccreate%5C%5Cpage.js%22%2C%22ids%22%3A%5B%5D%7D&server=false!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/next@14.2.35_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?modules=%7B%22request%22%3A%22C%3A%5C%5CUsers%5C%5CHP%5C%5CDownloads%5C%5Ccourier-dms%5C%5Cfrontend%5C%5Csrc%5C%5Capp%5C%5Cmerchant%5C%5Cshipments%5C%5Ccreate%5C%5Cpage.js%22%2C%22ids%22%3A%5B%5D%7D&server=false! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ (function(__unused_webpack_module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("Promise.resolve(/*! import() eager */).then(__webpack_require__.t.bind(__webpack_require__, /*! ./src/app/merchant/shipments/create/page.js */ \"(app-pages-browser)/./src/app/merchant/shipments/create/page.js\", 23));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy8ucG5wbS9uZXh0QDE0LjIuMzVfcmVhY3QtZG9tQDE4LjMuMV9yZWFjdEAxOC4zLjFfX3JlYWN0QDE4LjMuMS9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWZsaWdodC1jbGllbnQtZW50cnktbG9hZGVyLmpzP21vZHVsZXM9JTdCJTIycmVxdWVzdCUyMiUzQSUyMkMlM0ElNUMlNUNVc2VycyU1QyU1Q0hQJTVDJTVDRG93bmxvYWRzJTVDJTVDY291cmllci1kbXMlNUMlNUNmcm9udGVuZCU1QyU1Q3NyYyU1QyU1Q2FwcCU1QyU1Q21lcmNoYW50JTVDJTVDc2hpcG1lbnRzJTVDJTVDY3JlYXRlJTVDJTVDcGFnZS5qcyUyMiUyQyUyMmlkcyUyMiUzQSU1QiU1RCU3RCZzZXJ2ZXI9ZmFsc2UhIiwibWFwcGluZ3MiOiJBQUFBLHNOQUFvSSIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvPzM1ZGEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0KC8qIHdlYnBhY2tNb2RlOiBcImVhZ2VyXCIgKi8gXCJDOlxcXFxVc2Vyc1xcXFxIUFxcXFxEb3dubG9hZHNcXFxcY291cmllci1kbXNcXFxcZnJvbnRlbmRcXFxcc3JjXFxcXGFwcFxcXFxtZXJjaGFudFxcXFxzaGlwbWVudHNcXFxcY3JlYXRlXFxcXHBhZ2UuanNcIik7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/.pnpm/next@14.2.35_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?modules=%7B%22request%22%3A%22C%3A%5C%5CUsers%5C%5CHP%5C%5CDownloads%5C%5Ccourier-dms%5C%5Cfrontend%5C%5Csrc%5C%5Capp%5C%5Cmerchant%5C%5Cshipments%5C%5Ccreate%5C%5Cpage.js%22%2C%22ids%22%3A%5B%5D%7D&server=false!\n"));

/***/ }),

/***/ "(app-pages-browser)/./src/app/merchant/shipments/create/page.js":
/*!***************************************************!*\
  !*** ./src/app/merchant/shipments/create/page.js ***!
  \***************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {



;
    // Wrapped in an IIFE to avoid polluting the global scope
    ;
    (function () {
        var _a, _b;
        // Legacy CSS implementations will `eval` browser code in a Node.js context
        // to extract CSS. For backwards compatibility, we need to check we're in a
        // browser context before continuing.
        if (typeof self !== 'undefined' &&
            // AMP / No-JS mode does not inject these helpers:
            '$RefreshHelpers$' in self) {
            // @ts-ignore __webpack_module__ is global
            var currentExports = module.exports;
            // @ts-ignore __webpack_module__ is global
            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;
            // This cannot happen in MainTemplate because the exports mismatch between
            // templating and execution.
            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);
            // A module can be accepted automatically based on its exports, e.g. when
            // it is a Refresh Boundary.
            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {
                // Save the previous exports signature on update so we can compare the boundary
                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)
                module.hot.dispose(function (data) {
                    data.prevSignature =
                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);
                });
                // Unconditionally accept an update to this module, we'll check if it's
                // still a Refresh Boundary later.
                // @ts-ignore importMeta is replaced in the loader
                module.hot.accept();
                // This field is set when the previous version of this module was a
                // Refresh Boundary, letting us know we need to check for invalidation or
                // enqueue an update.
                if (prevSignature !== null) {
                    // A boundary can become ineligible if its exports are incompatible
                    // with the previous exports.
                    //
                    // For example, if you add/remove/change exports, we'll want to
                    // re-execute the importing modules, and force those components to
                    // re-render. Similarly, if you convert a class component to a
                    // function, we want to invalidate the boundary.
                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {
                        module.hot.invalidate();
                    }
                    else {
                        self.$RefreshHelpers$.scheduleUpdate();
                    }
                }
            }
            else {
                // Since we just executed the code for the module, it's possible that the
                // new exports made it ineligible for being a boundary.
                // We only care about the case when we were _previously_ a boundary,
                // because we already accepted this update (accidental side effect).
                var isNoLongerABoundary = prevSignature !== null;
                if (isNoLongerABoundary) {
                    module.hot.invalidate();
                }
            }
        }
    })();


/***/ })

});