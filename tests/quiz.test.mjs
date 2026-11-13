import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

class Element {
  constructor() {
    this.children = [];
    this.attributes = new Map();
    this.hidden = false;
    this.style = {};
    this.handlers = new Map();
    this.classList = {
      add: (name) => {
        this.className = `${this.className ?? ""} ${name}`.trim();
      }
    };
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  addEventListener(name, handler) {
    this.handlers.set(name, handler);
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this._textContent = "";
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  focus() {}

  click() {
    this.handlers.get("click")?.();
  }
}

function createQuiz(randomValues) {
  const ids = [
    "quiz", "result", "answers", "feedback", "next", "question-count",
    "score", "question", "progress", "progress-fill", "result-emoji",
    "result-title", "result-message", "result-score", "result-best",
    "result-storage-warning", "review-message", "review-list", "restart"
  ];
  const elements = new Map(ids.map((id) => [id, new Element()]));
  const document = {
    getElementById: (id) => elements.get(id),
    createElement: () => new Element(),
    createTextNode: (text) => ({ textContent: String(text) })
  };
  const math = Object.create(Math);
  math.random = () => randomValues.shift() ?? 0;
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const window = { localStorage: { getItem: () => null, setItem: () => {} } };
  const context = vm.createContext({ document, window, Math: math });

  vm.runInContext(script, context);
  return {
    elements,
    getAttempt: () => vm.runInContext("attemptQuestions", context),
    getQuestions: () => vm.runInContext("questions", context)
  };
}

test("each quiz attempt shuffles all questions and preserves answer behavior", () => {
  const randomValues = [...Array(9).fill(0), ...Array(9).fill(0.999)];
  const { elements, getAttempt, getQuestions } = createQuiz(randomValues);
  const questions = getQuestions();
  const firstAttempt = getAttempt();

  assert.equal(firstAttempt.length, questions.length);
  assert.equal(new Set(firstAttempt.map(({ question }) => question)).size, questions.length);
  assert.deepEqual(
    firstAttempt.map(({ question }) => question).sort(),
    questions.map(({ question }) => question).sort()
  );
  assert.notDeepEqual(firstAttempt.map(({ question }) => question), questions.map(({ question }) => question));

  firstAttempt.forEach((current, index) => {
    assert.equal(elements.get("question").textContent, current.question);
    assert.deepEqual(
      Array.from(elements.get("answers").children, (button) => button.children[1].textContent),
      Array.from(current.answers)
    );
    if (index === 0) {
      elements.get("answers").children[(current.correct + 1) % current.answers.length].click();
      assert.equal(elements.get("score").textContent, `0 / ${questions.length}`);
    } else {
      elements.get("answers").children[current.correct].click();
      assert.equal(elements.get("score").textContent, `${index} / ${questions.length}`);
    }
    assert.match(elements.get("feedback").textContent, new RegExp(current.fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(elements.get("progress").getAttribute("aria-valuenow"), String(index + 1));
    assert.equal(elements.get("progress-fill").style.width, `${(index + 1) / questions.length * 100}%`);
    if (index < firstAttempt.length - 1) elements.get("next").click();
  });

  elements.get("next").click();
  assert.equal(elements.get("result-score").textContent, `${questions.length - 1} / ${questions.length}`);
  assert.equal(elements.get("review-list").children.length, 1);
  assert.equal(elements.get("review-list").children[0].children[0].textContent, firstAttempt[0].question);

  elements.get("restart").click();
  const nextAttempt = getAttempt();
  assert.deepEqual(nextAttempt.map(({ question }) => question), questions.map(({ question }) => question));
  assert.notDeepEqual(nextAttempt.map(({ question }) => question), firstAttempt.map(({ question }) => question));
  assert.equal(elements.get("question").textContent, questions[0].question);
  assert.equal(elements.get("score").textContent, `0 / ${questions.length}`);
  assert.equal(elements.get("progress").getAttribute("aria-valuenow"), "0");
  assert.equal(elements.get("progress-fill").style.width, "0%");
});
