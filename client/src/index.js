"use strict";
exports.__esModule = true;
require("@fontsource/roboto");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var App_1 = require("./components/App");
var reportWebVitals_1 = require("./reportWebVitals");
var react_router_dom_1 = require("react-router-dom");
react_dom_1["default"].render(<react_router_dom_1.BrowserRouter basename={process.env.PUBLIC_URL} forceRefresh={false}>
        <App_1["default"] />
    </react_router_dom_1.BrowserRouter>, document.querySelector('#root'));
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
(0, reportWebVitals_1["default"])();
