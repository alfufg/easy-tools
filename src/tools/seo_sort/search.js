const stripProtocol = (value) => value.replace(/^https?:\/\//, "").replace(/^www\./, "").trim();

const normalizeUrlText = (value) => stripProtocol(value).replace(/\/$/, "");

async function fetchDocument(searchUrl) {
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  const html = await response.text();
  return new DOMParser().parseFromString(html, "text/html");
}

async function getBaiduSort(keyword, url) {
  const doc = await fetchDocument(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`);
  const contentLeft = doc.getElementById("content_left");
  if (!contentLeft) {
    return 0;
  }

  const match = Array.from(contentLeft.getElementsByClassName("c-container")).find((element) => {
    const muValue = element.getAttribute("mu") || "";
    return normalizeUrlText(muValue).includes(url);
  });

  return match?.id ? Number.parseInt(match.id, 10) || 0 : 0;
}

async function getBingSort(keyword, url) {
  const doc = await fetchDocument(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}`);
  const content = doc.getElementById("b_results");
  if (!content) {
    return 0;
  }

  const match = Array.from(content.getElementsByClassName("b_algo")).findIndex((element) => {
    const text = element.querySelector(".b_attribution")?.textContent || "";
    return normalizeUrlText(text).includes(url);
  });

  return match >= 0 ? match + 1 : 0;
}

async function getSogouSort(keyword, url) {
  const doc = await fetchDocument(`https://www.sogou.com/tx?query=${encodeURIComponent(keyword)}`);
  const content = doc.getElementById("main");
  if (!content) {
    return 0;
  }

  const match = Array.from(content.querySelectorAll("[data-url][data-rank]")).find((element) => {
    const dataUrl = element.getAttribute("data-url") || "";
    return normalizeUrlText(dataUrl).includes(url);
  });

  return match ? Number.parseInt(match.getAttribute("data-rank"), 10) + 1 : 0;
}

async function get360Sort(keyword, url) {
  const doc = await fetchDocument(`https://www.so.com/s?q=${encodeURIComponent(keyword)}`);
  const items = Array.from(doc.querySelectorAll(".res-list"));
  const match = items.findIndex((element) => {
    const href = element.querySelector(".res-title a")?.getAttribute("data-mdurl") || "";
    return normalizeUrlText(href).includes(url);
  });

  return match >= 0 ? match + 1 : 0;
}

const platformDefinitions = [
  {
    key: "baidu",
    label: "百度",
    runner: getBaiduSort
  },
  {
    key: "bing",
    label: "必应",
    runner: getBingSort
  },
  {
    key: "sogou",
    label: "搜狗",
    runner: getSogouSort
  },
  {
    key: "360",
    label: "360",
    runner: get360Sort
  },
  {
    key: "shenma",
    label: "神马",
    comingSoon: true
  },
  {
    key: "kuake",
    label: "夸克",
    comingSoon: true
  }
];

export const platformOptions = platformDefinitions.map(({ key, label, comingSoon }) => ({
  key,
  label,
  comingSoon: Boolean(comingSoon)
}));

function buildResult(definition, payload = {}) {
  return {
    key: definition.key,
    label: definition.label,
    rank: payload.rank ?? null,
    status: payload.status || "idle",
    message: payload.message || ""
  };
}

export async function runSeoQuery({ keyword, url, platforms, onProgress }) {
  const normalizedUrl = normalizeUrlText(url);
  const selectedDefinitions = platformDefinitions.filter((definition) => platforms.includes(definition.key));
  const results = [];

  for (const [index, definition] of selectedDefinitions.entries()) {
    if (definition.comingSoon) {
      results.push(
        buildResult(definition, {
          status: "coming_soon",
          message: "该搜索源暂未接入，保留为后续扩展位。"
        })
      );
      onProgress?.({
        current: index + 1,
        total: selectedDefinitions.length,
        label: definition.label,
        percent: Math.round(((index + 1) / selectedDefinitions.length) * 100)
      });
      continue;
    }

    try {
      const rank = await definition.runner(keyword, normalizedUrl);
      results.push(
        buildResult(definition, {
          rank,
          status: rank > 0 ? "matched" : "missing",
          message: rank > 0 ? `第 ${rank} 位找到匹配结果` : "未找到匹配结果"
        })
      );
    } catch (error) {
      results.push(
        buildResult(definition, {
          status: "error",
          message: error instanceof Error ? error.message : "查询失败"
        })
      );
    }

    onProgress?.({
      current: index + 1,
      total: selectedDefinitions.length,
      label: definition.label,
      percent: Math.round(((index + 1) / selectedDefinitions.length) * 100)
    });
  }

  return results;
}
