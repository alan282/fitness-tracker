/* 列出非杠铃类器材描述中所有含"杠铃"的句子（预览批量替换范围） */
const fs = require('fs');
const vm = require('vm');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync('js/exercises-data.js', 'utf8'), ctx);
vm.runInContext(`
const nonBarbell = ['cable', 'body weight', 'leverage machine', 'band', 'medicine ball', 'stability ball', 'rope', 'sled machine', 'dumbbell', 'kettlebell'];
EXERCISES.filter(e => nonBarbell.includes(e.equipment)).forEach(e => {
  (e.instructions_zh || []).forEach((s, i) => {
    if (s.includes('杠铃')) console.log(e.id + ' [' + i + '] ' + e.name_zh + ' :: ' + s);
  });
});
`, ctx);
