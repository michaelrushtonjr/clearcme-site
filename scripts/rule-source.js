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


module.exports = { loadStateRequirements, parseHours, specialTopic };
