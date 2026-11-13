const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');
function loadStateRequirements() {
  const sourcePath = path.join(__dirname, '..', 'lib', 'state-requirements.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const sandbox = { exports: {}, module: { exports: {} } };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(output, sandbox, { filename: sourcePath });
  return sandbox.exports.STATE_REQUIREMENTS;
}

function parseHours(hours) {
  if (!hours) return 0;
  const value = String(hours);
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

// Hours a rule states for itself: a number given in the rules file, or a count
// at the very start of its label ("2 hrs per cycle", "At least 1 hr, one-time").
// Returns null when the rule states none. "Board course every 48 months" is not
// 48 hours and "20% of total mandatory CME per cycle" is not 20.
function statedHours(topic) {
  if (typeof topic.hoursRequired === 'number' && Number.isFinite(topic.hoursRequired) && topic.hoursRequired >= 0) return topic.hoursRequired;
  const match = String(topic.hours || '').match(/^(?:at least\s+)?(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|credits?)\b/i);
  return match ? Number(match[1]) : null;
}

function specialTopic(topic) {
  const text = `${topic.topic || ''} ${topic.note || ''}`.toLowerCase();
  if (/dea mate|mate training/.test(text)) return 'SUBSTANCE_USE';
  if (/implicit bias/.test(text)) return 'IMPLICIT_BIAS';
  if (/end-of-life|end of life|palliative|hospice/.test(text)) return 'END_OF_LIFE_CARE';
  if (/domestic|sexual violence/.test(text)) return 'DOMESTIC_VIOLENCE';
  if (/child abuse|pediatric abusive|abusive head/.test(text)) return 'CHILD_ABUSE';
  if (/elder abuse/.test(text)) return 'ELDER_ABUSE';
  if (/human trafficking/.test(text)) return 'HUMAN_TRAFFICKING';
  if (/infection|infectious|hiv/.test(text)) return 'INFECTION_CONTROL';
  if (/risk management|patient safety|medical error/.test(text)) return 'PATIENT_SAFETY';
  if (/ethics|board regulations|professional boundaries|sexual misconduct/.test(text)) return 'ETHICS';
  if (/cultural/.test(text)) return 'CULTURAL_COMPETENCY';
  if (/suicide|behavioral health/.test(text)) return 'SUICIDE_PREVENTION';
  if (/opioid|controlled substance|pain management|kasper|prescribing|substance|addiction|sbirt|oud|cds/.test(text)) return 'OPIOID_PRESCRIBING';
  return 'OTHER_MANDATORY';
}


module.exports = { loadStateRequirements, parseHours, statedHours, specialTopic };
