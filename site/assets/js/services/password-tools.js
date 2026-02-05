const PASSWORD_RULES = Object.freeze({
  length: (value) => value.length >= 8,
  letterCase: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  number: (value) => /\d/.test(value),
  symbol: (value) => /[^A-Za-z0-9]/.test(value),
});

export function evaluatePasswordStrength(password) {
  const value = String(password || "");
  const rules = {
    length: PASSWORD_RULES.length(value),
    letterCase: PASSWORD_RULES.letterCase(value),
    number: PASSWORD_RULES.number(value),
    symbol: PASSWORD_RULES.symbol(value),
  };

  let score = Object.values(rules).filter(Boolean).length;
  if (value.length >= 12 && score >= 3) {
    score += 1;
  }

  if (!value) {
    return {
      label: "não avaliada",
      width: 0,
      levelClass: "",
      rules,
    };
  }

  if (score <= 1) {
    return {
      label: "fraca",
      width: 25,
      levelClass: "is-weak",
      rules,
    };
  }

  if (score <= 2) {
    return {
      label: "média",
      width: 50,
      levelClass: "is-medium",
      rules,
    };
  }

  if (score <= 3) {
    return {
      label: "boa",
      width: 72,
      levelClass: "is-good",
      rules,
    };
  }

  return {
    label: "forte",
    width: 100,
    levelClass: "is-strong",
    rules,
  };
}

export function validateStrongPassword(password) {
  const strength = evaluatePasswordStrength(password);
  return (
    strength.rules.length &&
    strength.rules.letterCase &&
    strength.rules.number &&
    strength.rules.symbol
  );
}

export function generateSecurePassword(length = 14) {
  const targetLength = Math.max(10, Number(length) || 14);
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%*()-_=+?";
  const charset = `${uppercase}${lowercase}${numbers}${symbols}`;

  const required = [
    pickRandomChar(uppercase),
    pickRandomChar(lowercase),
    pickRandomChar(numbers),
    pickRandomChar(symbols),
  ];

  while (required.length < targetLength) {
    required.push(pickRandomChar(charset));
  }

  return shuffle(required).join("");
}

export async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_error) {
    // fallback below
  }

  try {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(helper);
    return copied;
  } catch (_error) {
    return false;
  }
}

function pickRandomChar(charset) {
  return charset[getRandomInt(charset.length)];
}

function shuffle(items) {
  const array = [...items];

  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = getRandomInt(index + 1);
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }

  return array;
}

function getRandomInt(maxExclusive) {
  if (window.crypto?.getRandomValues) {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    return randomArray[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}
