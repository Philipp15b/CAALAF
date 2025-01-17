/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />

module Traverse {

    import ccs = CCS;
    import hml = HML;

    // http://ironcreek.net/phpsyntaxtree/?
    export class LabelledBracketNotation implements ccs.ProcessVisitor<string>, ccs.ProcessDispatchHandler<void> {

        protected stringPieces : string[];
        private recurseOnceForNamedProcess = undefined;

        constructor() {
        }

        visit(process : ccs.Process) {
            this.stringPieces = [];
            if (process instanceof ccs.NamedProcess) {
                this.recurseOnceForNamedProcess = (<ccs.NamedProcess>process).name;
            }
            process.dispatchOn(this);
            return this.stringPieces.join(" ");
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            this.stringPieces.push("[0]");
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            if (process.name === this.recurseOnceForNamedProcess) {
                this.recurseOnceForNamedProcess = undefined;
                this.stringPieces.push("[NamedProcess");
                this.stringPieces.push(process.name + " =");
                process.subProcess.dispatchOn(this);
                this.stringPieces.push("]");
            } else {
                this.stringPieces.push("[ConstantProcess " + process.name + "]");
            }
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            this.stringPieces.push("[Summation");
            process.subProcesses.forEach(subProc => {
                subProc.dispatchOn(this);
            });
            this.stringPieces.push("]");
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            this.stringPieces.push("[Composition");
            process.subProcesses.forEach(subProc => {
                subProc.dispatchOn(this);
            });
            this.stringPieces.push("]");
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            this.stringPieces.push("[ActionPrefix");
            this.stringPieces.push(process.action.toString() + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            this.stringPieces.push("[Restriction");
            process.subProcess.dispatchOn(this);
            var labels = [];
            process.restrictedLabels.forEach(l => labels.push(l));
            this.stringPieces.push("\\ (" + labels.join(",") + ")]");
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            this.stringPieces.push("[Relabelling");
            process.subProcess.dispatchOn(this);
            var relabels = [];
            process.relabellings.forEach((f, t) => relabels.push(t + "/" + f));
            this.stringPieces.push(" (" + relabels.join(",") + ")]");
        }
    }

    export class SizeOfProcessTreeVisitor implements ccs.ProcessVisitor<number>, ccs.ProcessDispatchHandler<number> {
        //not very usable at the moment.
        constructor() {
        }

        visit(process : ccs.Process) {
            return process.dispatchOn(this);
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            return 1;
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            return 1;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            var sum = 1;
            process.subProcesses.forEach(subProc => {
                sum += subProc.dispatchOn(this);
            });
            return sum;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            var sum = 1;
            process.subProcesses.forEach(subProc => {
                sum += subProc.dispatchOn(this);
            });
            return sum;
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            return 1 + process.nextProcess.dispatchOn(this);
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            return 1 + process.subProcess.dispatchOn(this);
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            return 1 + process.subProcess.dispatchOn(this);
        }
    }

    export function wrapIfInstanceOf(stringRepr : string, object : any, classes) {
        for (var i = 0; i < classes.length; i++) {
            if (object instanceof classes[i]) {
                return "(" + stringRepr + ")";
            }
        }
        return stringRepr;
    }

    export class CCSNotationVisitor implements ccs.ProcessVisitor<string>, ccs.ProcessDispatchHandler<string> {

        private insideNamedProcess = undefined;
        protected cache;

        constructor() {
            this.clearCache();
        }

        clearCache() {
            this.cache = {};
        }

        visit(process : ccs.Process) {
            return process.dispatchOn(this);
        }

        dispatchNullProcess(process : ccs.NullProcess) {
            return this.cache[process.id] = "0";
        }

        dispatchNamedProcess(process : ccs.NamedProcess) {
            var result = this.cache[process.id];
            //How to handle recursion???
            if (!result) {
                result = this.cache[process.id] = process.name;
            }
            return result;
        }

        dispatchSummationProcess(process : ccs.SummationProcess) {
            var result = this.cache[process.id],
                subStr;
            if (!result) {
                subStr = process.subProcesses.map(subProc => subProc.dispatchOn(this));
                result = this.cache[process.id] = subStr.join(" + ");
            }
            return result;
        }

        dispatchCompositionProcess(process : ccs.CompositionProcess) {
            var result = this.cache[process.id],
                subStr;
            if (!result) {
                subStr = process.subProcesses.map(subProc => {
                    var unwrapped = subProc.dispatchOn(this);
                    return wrapIfInstanceOf(unwrapped, subProc, [ccs.SummationProcess]);
                });
                result = this.cache[process.id] = subStr.join(" | ");
            }
            return result;
        }

        dispatchActionPrefixProcess(process : ccs.ActionPrefixProcess) {
            var result = this.cache[process.id],
                subStr;
            if (!result) {
                subStr = process.nextProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.nextProcess, [ccs.SummationProcess, ccs.CompositionProcess]);
                result = this.cache[process.id] = process.action.toString(true) + "." + subStr;
            }
            return result;
        }

        dispatchRestrictionProcess(process : ccs.RestrictionProcess) {
            var result = this.cache[process.id],
                subStr, labels;
            if (!result) {
                subStr = process.subProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.subProcess,
                    [ccs.SummationProcess, ccs.CompositionProcess, ccs.ActionPrefixProcess]);
                labels = process.restrictedLabels.toArray();
                result = this.cache[process.id] = subStr + '<span style="color:gray"> \\ {' + labels.join(", ") + "}</span>";
            }
            return result;
        }

        dispatchRelabellingProcess(process : ccs.RelabellingProcess) {
            var result = this.cache[process.id],
                subStr, relabels;
            if (!result) {
                subStr = process.subProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.subProcess,
                    [ccs.SummationProcess, ccs.CompositionProcess, ccs.ActionPrefixProcess]);
                relabels = [];
                process.relabellings.forEach((from, to) => {
                    relabels.push(to + "/" + from);
                });
                result = this.cache[process.id] = subStr + " [" + relabels.join(",") + "]";
            }
            return result;
        }

        dispatchCollapsedProcess(process : ccs.CollapsedProcess) {
            var result = this.cache[process.id];
            if (!result) {
                result = "{" + process.subProcesses.map(subProc => subProc instanceof ccs.NamedProcess ? subProc.name : subProc.id).join(", ") + "}";
            }
            return result;
        }
    }

    export function safeHtml(str : string) : string {
        var entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;"
        };
        return str.replace(/[&<>"'\/]/g, symbol => entities[symbol] || symbol);
    }

    export class HMLNotationVisitor implements hml.FormulaVisitor<string>, hml.FormulaDispatchHandler<string> {
        private cache;

        constructor(private showSemicolon = true, private formatComplement = true, private safeHtml = true) {
            this.clearCache();
        }

        clearCache() {
            this.cache = Object.create(null);
        }

        visit(formula : hml.Formula) {
            if (this.showSemicolon) {
                return formula.dispatchOn(this) + ";";
            } else {
                return formula.dispatchOn(this);
            }
        }

        dispatchDisjFormula(formula : hml.DisjFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStrs = formula.subFormulas.map(subF => subF.dispatchOn(this));
                result = this.cache[formula.id] = subStrs.join(" or ");
            }
            return result;
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStrs = formula.subFormulas.map(subF => {
                    var unwrapped = subF.dispatchOn(this)
                    return wrapIfInstanceOf(unwrapped, subF, [hml.DisjFormula]);
                });
                result = this.cache[formula.id] = subStrs.join(" and ");
            }
            return result;
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = "tt";
            }
            return result;
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = "ff";
            }
            return result;
        }

        dispatchStrongExistsFormula(formula : hml.StrongExistsFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "<";
                var closing = ">";
                
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }

                result = this.cache[formula.id] = starting +
                    formula.actionMatcher.toString(this.formatComplement) + closing +
                    wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        }

        dispatchStrongForAllFormula(formula : hml.StrongForAllFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "[";
                var closing = "]";
                
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }

                result = this.cache[formula.id] = starting +
                    formula.actionMatcher.toString(this.formatComplement) + closing +
                    wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        }

        dispatchWeakExistsFormula(formula : hml.WeakExistsFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "<<";
                var closing = ">>";
                
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }

                result = this.cache[formula.id] = starting +
                    formula.actionMatcher.toString(this.formatComplement) + closing +
                    wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        }

        dispatchWeakForAllFormula(formula : hml.WeakForAllFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "[[";
                var closing = "]]";
                
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }

                result = this.cache[formula.id] = starting +
                    formula.actionMatcher.toString(this.formatComplement) + closing +
                    wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        }

        dispatchMinFixedPointFormula(formula : hml.MinFixedPointFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = formula.variable + " min= " + subStr;
            }
            return result;
        }

        dispatchMaxFixedPointFormula(formula : hml.MaxFixedPointFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = formula.variable + " max= " + subStr;
            }
            return result;
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = formula.variable;
            }
            return result;
        }
    }

    export class HMLSuccGenVisitor implements HML.FormulaVisitor<Array<HML.Formula>>, HML.FormulaDispatchHandler<Array<HML.Formula>> {
        private isFirst = true;

        constructor(private hmlFormulaSet : HML.FormulaSet) {
        }

        visit(formula : HML.Formula) {
            return formula.dispatchOn(this);
        }

        private isFirstFormula() : boolean {
            if(this.isFirst){
                this.isFirst = !this.isFirst;
                return true;
            }

            return false;
        }

        dispatchDisjFormula(formula : HML.DisjFormula) {
            return formula.subFormulas;
        }

        dispatchConjFormula(formula : HML.ConjFormula) {
            return formula.subFormulas;
        }

        dispatchTrueFormula(formula : HML.TrueFormula) {
            var result = [];

            result.push(null);

            return result;
        }

        dispatchFalseFormula(formula : HML.FalseFormula) {
            var result = [];

            result.push(null);

            return result;
        }

        dispatchStrongExistsFormula(formula : HML.StrongExistsFormula) {
            var result = [];

            result.push(formula.subFormula);

            return result;
        }

        dispatchStrongForAllFormula(formula : HML.StrongForAllFormula) {
            var result = [];

            result.push(formula.subFormula);

            return result;
        }

        dispatchWeakExistsFormula(formula : HML.WeakExistsFormula) {
            var result = []

            result.push(formula.subFormula);

            return result;
        }

        dispatchWeakForAllFormula(formula : HML.WeakForAllFormula) {
            var result = [];

            result.push(formula.subFormula);

            return result;
        }

        dispatchMinFixedPointFormula(formula : HML.MinFixedPointFormula) {
            var result = [];

            result.push(formula.subFormula);

            return result;
        }

        dispatchMaxFixedPointFormula(formula : HML.MaxFixedPointFormula) {
            var result = [];

            result.push(formula.subFormula);

            return result;
        }

        dispatchVariableFormula(formula : HML.VariableFormula) {
            var result = [];
            var namedFormulaDef = <HML.MinFixedPointFormula | HML.MaxFixedPointFormula>this.hmlFormulaSet.formulaByName(formula.variable);

            if (namedFormulaDef) {
                result.push(namedFormulaDef.subFormula);
            }
            else {
                throw "HML variable " + formula.variable + " has no definition";
            }

            return result;
        }
    }

    /*
        This class should hold any simplications that can be done to the HML formulas.

        This class currenly only remove redundant taus and simplifies conjunction
        and disjunction with only one term.
    */
    export class HMLSimplifier implements hml.FormulaDispatchHandler<hml.Formula> {

        private prevSet : hml.FormulaSet;

        visit(formulaSet : hml.FormulaSet) : hml.FormulaSet {
            this.prevSet = formulaSet;
            var result = formulaSet.map(formula => formula.dispatchOn(this));
            this.prevSet = null;
            return result;
        }

        visitVariableFreeFormula(formula : hml.Formula) {
            this.prevSet = new hml.FormulaSet();
            var result = formula.dispatchOn(this);
            this.prevSet = null;
            return result;
        }

        dispatchDisjFormula(formula : hml.DisjFormula) {
            var subFormulas = formula.subFormulas.map(subF => subF.dispatchOn(this));
            return subFormulas.length > 1 ? this.prevSet.newDisj(subFormulas) : subFormulas[0];
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            var subFormulas = formula.subFormulas.map(subF => subF.dispatchOn(this));
            return subFormulas.length > 1 ? this.prevSet.newConj(subFormulas) : subFormulas[0];
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            return this.prevSet.newTrue();
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            return this.prevSet.newFalse();
        }

        dispatchStrongExistsFormula(formula : hml.StrongExistsFormula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newStrongExists(formula.actionMatcher, subFormula);
        }

        dispatchStrongForAllFormula(formula : hml.StrongForAllFormula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newStrongForAll(formula.actionMatcher, subFormula);
        }

        dispatchWeakExistsFormula(formula : hml.WeakExistsFormula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            //Todo: this should probably be more robust
            //Check if  <<X>> <<Y>> ...
            if (subFormula instanceof hml.WeakExistsFormula) {
                if (formula.actionMatcher instanceof hml.SingleActionMatcher &&
                    formula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    //  <<tau>> <<X>> ...
                    return subFormula;
                } else if (subFormula.actionMatcher instanceof hml.SingleActionMatcher &&
                    subFormula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    // <<X><<tau>> ...
                    return this.prevSet.newWeakExists(formula.actionMatcher, subFormula.subFormula);
                }
            }
            return this.prevSet.newWeakExists(formula.actionMatcher, subFormula);
        }

        dispatchWeakForAllFormula(formula : hml.WeakForAllFormula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            //Todo: this should probably be more robust
            //Check if  [[X]] [[Y]] ...
            if (subFormula instanceof hml.WeakForAllFormula) {
                if (formula.actionMatcher instanceof hml.SingleActionMatcher &&
                    formula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    //  [[tau]] [[X]] ...
                    return subFormula;
                } else if (subFormula.actionMatcher instanceof hml.SingleActionMatcher &&
                    subFormula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    // [[X]] [[tau]]
                    return this.prevSet.newWeakForAll(formula.actionMatcher, subFormula.subFormula);
                }
                //TODO: Add on the right
            }
            return this.prevSet.newWeakForAll(formula.actionMatcher, subFormula);
        }

        dispatchMinFixedPointFormula(formula : hml.MinFixedPointFormula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newMinFixedPoint(formula.variable, subFormula);
        }

        dispatchMaxFixedPointFormula(formula : hml.MaxFixedPointFormula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newMaxFixedPoint(formula.variable, subFormula);
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            return this.prevSet.referVariable(formula.variable);
        }
    }

    // Repurposes the visitor to be event based.
    // Only provides one callback per event. Client must multiplex if necessary.
    export class FormulaEventWalker implements hml.FormulaDispatchHandler<void> {
        private events : any = Object.create(null);

        private doCallback(event, obj) {
            var callback = this.events[event];
            if (callback) {
                callback.call(null, obj);
            }
        }

        on(event : string, callback : (formula : hml.Formula) => any) {
            this.events[event] = callback;
        }

        visit(formulaSet : hml.FormulaSet) : void {
            if (formulaSet.getTopFormula()) {
                formulaSet.getTopFormula().dispatchOn(this);
            }
            formulaSet.getTopLevelFormulas().forEach(formula => formula.dispatchOn(this));
        }

        dispatchDisjFormula(formula : hml.DisjFormula) {
            this.doCallback('enterDisjunction', formula);
            formula.subFormulas.map(subF => subF.dispatchOn(this));
            this.doCallback('leaveDisjunction', formula);
        }

        dispatchConjFormula(formula : hml.ConjFormula) {
            this.doCallback('enterConjunction', formula);
            formula.subFormulas.map(subF => subF.dispatchOn(this));
            this.doCallback('leaveConjunction', formula);
        }

        dispatchTrueFormula(formula : hml.TrueFormula) {
            this.doCallback('enterTrue', formula);
        }

        dispatchFalseFormula(formula : hml.FalseFormula) {
            this.doCallback('enterFalse', formula);
        }

        dispatchStrongExistsFormula(formula : hml.StrongExistsFormula) {
            this.doCallback('enterStrongExists', formula);
            formula.subFormula.dispatchOn(this);
            this.doCallback('leaveStrongExists', formula);
        }

        dispatchStrongForAllFormula(formula : hml.StrongForAllFormula) {
            this.doCallback('enterStrongForAll', formula);
            formula.subFormula.dispatchOn(this);
            this.doCallback('leaveStrongForAll', formula);
        }

        dispatchWeakExistsFormula(formula : hml.WeakExistsFormula) {
            this.doCallback('enterWeakExists', formula);
            formula.subFormula.dispatchOn(this);
            this.doCallback('leaveWeakExists', formula);
        }

        dispatchWeakForAllFormula(formula : hml.WeakForAllFormula) {
            this.doCallback('enterWeakForAll', formula);
            formula.subFormula.dispatchOn(this);
            this.doCallback('leaveWeakForAll', formula);
        }

        dispatchMinFixedPointFormula(formula : hml.MinFixedPointFormula) {
            this.doCallback('enterMinFixedPoint', formula);
            formula.subFormula.dispatchOn(this);
            this.doCallback('leaveMinFixedPoint', formula);
        }

        dispatchMaxFixedPointFormula(formula : hml.MaxFixedPointFormula) {
            this.doCallback('enterMaxFixedPoint', formula);
            formula.subFormula.dispatchOn(this);
            this.doCallback('leaveMaxFixedPoint', formula);
        }

        dispatchVariableFormula(formula : hml.VariableFormula) {
            this.doCallback('enterVariable', formula);
        }        
    }
}
