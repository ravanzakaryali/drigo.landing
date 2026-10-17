// Rolling labels: a visually hidden copy for assistive tech, two letter rows for the eye.
// Safe to call again on an element whose text was replaced (the live car list does that).
export function roll(element) {
  if (element.dataset.rolled === 'true') return;
  const text = element.textContent.trim();
  if (!text) return;
  const row = className => {
    const span = document.createElement('span'); span.className = className;
    [...text].forEach((character, i) => { const letter = document.createElement('i'); letter.textContent = character; letter.style.setProperty('--i', i); span.append(letter); });
    return span;
  };
  const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = text;
  const rolled = document.createElement('span'); rolled.className = 'roll'; rolled.setAttribute('aria-hidden', 'true'); rolled.append(row('roll-a'), row('roll-b'));
  element.replaceChildren(label, rolled);
  element.dataset.rolled = 'true';
}

export function setRolledText(element, text) {
  delete element.dataset.rolled;
  element.textContent = text;
  roll(element);
}
