var Scorm12API_scorm12_constants = api_constants.scorm12;
var Scorm12API_global_constants = api_constants.global;
var Scorm12API_scorm12_error_codes = error_codes.scorm12;
var Scorm12API = (function (_super) {
    __extends(Scorm12API, _super);
    function Scorm12API(settings) {
        var _this = this;
        if (settings) {
            if (settings.mastery_override === undefined) {
                settings.mastery_override = false;
            }
        }
        _this = _super.call(this, Scorm12API_scorm12_error_codes, settings) || this;
        _this.cmi = new scorm12_cmi_CMI();
        _this.nav = new NAV();
        _this.LMSInitialize = _this.lmsInitialize;
        _this.LMSFinish = _this.lmsFinish;
        _this.LMSGetValue = _this.lmsGetValue;
        _this.LMSSetValue = _this.lmsSetValue;
        _this.LMSCommit = _this.lmsCommit;
        _this.LMSGetLastError = _this.lmsGetLastError;
        _this.LMSGetErrorString = _this.lmsGetErrorString;
        _this.LMSGetDiagnostic = _this.lmsGetDiagnostic;
        return _this;
    }
    Scorm12API.prototype.lmsInitialize = function () {
        this.cmi.initialize();
        return this.initialize("LMSInitialize", "LMS was already initialized!", "LMS is already finished!");
    };
    Scorm12API.prototype.lmsFinish = function () {
        var result = this.terminate("LMSFinish", true);
        if (result === Scorm12API_global_constants.SCORM_TRUE) {
            if (this.nav.event !== "") {
                if (this.nav.event === "continue") {
                    this.processListeners("SequenceNext");
                }
                else {
                    this.processListeners("SequencePrevious");
                }
            }
            else if (this.settings.autoProgress) {
                this.processListeners("SequenceNext");
            }
        }
        return result;
    };
    Scorm12API.prototype.lmsGetValue = function (CMIElement) {
        return this.getValue("LMSGetValue", false, CMIElement);
    };
    Scorm12API.prototype.lmsSetValue = function (CMIElement, value) {
        return this.setValue("LMSSetValue", "LMSCommit", false, CMIElement, value);
    };
    Scorm12API.prototype.lmsCommit = function () {
        return this.commit("LMSCommit", false);
    };
    Scorm12API.prototype.lmsGetLastError = function () {
        return this.getLastError("LMSGetLastError");
    };
    Scorm12API.prototype.lmsGetErrorString = function (CMIErrorCode) {
        return this.getErrorString("LMSGetErrorString", CMIErrorCode);
    };
    Scorm12API.prototype.lmsGetDiagnostic = function (CMIErrorCode) {
        return this.getDiagnostic("LMSGetDiagnostic", CMIErrorCode);
    };
    Scorm12API.prototype.setCMIValue = function (CMIElement, value) {
        return this._commonSetCMIValue("LMSSetValue", false, CMIElement, value);
    };
    Scorm12API.prototype.getCMIValue = function (CMIElement) {
        return this._commonGetCMIValue("getCMIValue", false, CMIElement);
    };
    Scorm12API.prototype.getChildElement = function (CMIElement, _value, foundFirstIndex) {
        if (this.stringMatches(CMIElement, "cmi\\.objectives\\.\\d+")) {
            return new scorm12_cmi_CMIObjectivesObject();
        }
        else if (foundFirstIndex &&
            this.stringMatches(CMIElement, "cmi\\.interactions\\.\\d+\\.correct_responses\\.\\d+")) {
            return new scorm12_cmi_CMIInteractionsCorrectResponsesObject();
        }
        else if (foundFirstIndex &&
            this.stringMatches(CMIElement, "cmi\\.interactions\\.\\d+\\.objectives\\.\\d+")) {
            return new scorm12_cmi_CMIInteractionsObjectivesObject();
        }
        else if (!foundFirstIndex &&
            this.stringMatches(CMIElement, "cmi\\.interactions\\.\\d+")) {
            return new scorm12_cmi_CMIInteractionsObject();
        }
        return null;
    };
    Scorm12API.prototype.validateCorrectResponse = function (_CMIElement, _value) {
    };
    Scorm12API.prototype.getLmsErrorMessageDetails = function (errorNumber, detail) {
        var basicMessage = "No Error";
        var detailMessage = "No Error";
        errorNumber = String(errorNumber);
        if (Scorm12API_scorm12_constants.error_descriptions[errorNumber]) {
            basicMessage =
                Scorm12API_scorm12_constants.error_descriptions[errorNumber].basicMessage;
            detailMessage =
                Scorm12API_scorm12_constants.error_descriptions[errorNumber].detailMessage;
        }
        return detail ? detailMessage : basicMessage;
    };
    Scorm12API.prototype.replaceWithAnotherScormAPI = function (newAPI) {
        this.cmi = newAPI.cmi;
    };
    Scorm12API.prototype.renderCommitCMI = function (terminateCommit) {
        var cmiExport = this.renderCMIToJSONObject();
        if (terminateCommit) {
            cmiExport.cmi.core.total_time = this.cmi.getCurrentTotalTime();
        }
        var result = [];
        var flattened = flatten(cmiExport);
        switch (this.settings.dataCommitFormat) {
            case "flattened":
                return flatten(cmiExport);
            case "params":
                for (var item in flattened) {
                    if ({}.hasOwnProperty.call(flattened, item)) {
                        result.push("".concat(item, "=").concat(flattened[item]));
                    }
                }
                return result;
            case "json":
            default:
                return cmiExport;
        }
    };
    Scorm12API.prototype.storeData = function (terminateCommit) {
        var _a, _b, _c;
        if (terminateCommit) {
            var originalStatus = this.cmi.core.lesson_status;
            if (originalStatus === "not attempted") {
                this.cmi.core.lesson_status = "completed";
            }
            if (this.cmi.core.lesson_mode === "normal") {
                if (this.cmi.core.credit === "credit") {
                    if (this.settings.mastery_override &&
                        this.cmi.student_data.mastery_score !== "" &&
                        this.cmi.core.score.raw !== "") {
                        if (parseFloat(this.cmi.core.score.raw) >=
                            parseFloat(this.cmi.student_data.mastery_score)) {
                            this.cmi.core.lesson_status = "passed";
                        }
                        else {
                            this.cmi.core.lesson_status = "failed";
                        }
                    }
                }
            }
            else if (this.cmi.core.lesson_mode === "browse") {
                if ((((_c = (_b = (_a = this.startingData) === null || _a === void 0 ? void 0 : _a.cmi) === null || _b === void 0 ? void 0 : _b.core) === null || _c === void 0 ? void 0 : _c.lesson_status) || "") === "" &&
                    originalStatus === "not attempted") {
                    this.cmi.core.lesson_status = "browsed";
                }
            }
        }
        var commitObject = this.renderCommitCMI(terminateCommit || this.settings.alwaysSendTotalTime);
        if (this.apiLogLevel === Scorm12API_global_constants.LOG_LEVEL_DEBUG) {
            console.debug("Commit (terminated: " + (terminateCommit ? "yes" : "no") + "): ");
            console.debug(commitObject);
        }
        if (typeof this.settings.lmsCommitUrl === "string") {
            return this.processHttpRequest(this.settings.lmsCommitUrl, commitObject, terminateCommit);
        }
        else {
            return {
                result: Scorm12API_global_constants.SCORM_TRUE,
                errorCode: 0,
            };
        }
    };
    return Scorm12API;
}(src_BaseAPI));
/* harmony default export */ var src_Scorm12API = (Scorm12API);