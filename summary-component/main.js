const CATEGORY_MODIFIERS = {
  Reaction: 'item-reaction',
  Memory: 'item-memory',
  Verbal: 'item-verbal',
  Visual: 'item-visual',
};

const MAX_SCORE = 100;

function createSummaryItem({ category, score, icon }) {
  const item = document.createElement('li');
  item.className = `summary-item ${CATEGORY_MODIFIERS[category] ?? ''}`.trim();

  const label = document.createElement('div');
  label.className = 'category';

  const image = document.createElement('img');
  image.src = icon;
  image.alt = '';

  const name = document.createElement('span');
  name.textContent = category;

  label.append(image, name);

  const scoreWrapper = document.createElement('div');
  scoreWrapper.className = 'score-wrapper';

  const value = document.createElement('span');
  value.className = 'score-value';
  value.textContent = score;

  const max = document.createElement('span');
  max.className = 'score-max';
  max.textContent = ` / ${MAX_SCORE}`;

  scoreWrapper.append(value, max);
  item.append(label, scoreWrapper);

  return item;
}

async function renderSummary() {
  const list = document.querySelector('.summary-list');

  try {
    const response = await fetch('./data.json');

    if (!response.ok) {
      throw new Error(`data.json responded with ${response.status}`);
    }

    list.append(...(await response.json()).map(createSummaryItem));
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'summary-error';
    message.textContent = 'The results could not be loaded. Serve this page over HTTP and reload.';
    list.replaceWith(message);
    console.error(error);
  }
}

renderSummary();
