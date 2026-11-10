#!/usr/bin/env bash
# Публикация на GitHub Pages: собирает ветку gh-pages ТОЛЬКО из файлов сайта
# (PLAN.md, scripts/ и прочее туда не попадают) и пушит её.
# Запуск из корня проекта:  bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_FILES=(index.html css js img music)

export GIT_INDEX_FILE="$(git rev-parse --git-dir)/deploy-index"
rm -f "$GIT_INDEX_FILE"
git read-tree --empty
git add -- "${SITE_FILES[@]}"
git rm -q --cached --ignore-unmatch img/.gitkeep music/covers/.gitkeep
# .nojekyll — чтобы GitHub отдавал файлы как есть
blob=$(printf '' | git hash-object -w --stdin)
git update-index --add --cacheinfo 100644 "$blob" .nojekyll
tree=$(git write-tree)
rm -f "$GIT_INDEX_FILE"
unset GIT_INDEX_FILE

parent=()
if git rev-parse -q --verify refs/heads/gh-pages >/dev/null; then
  if [ "$(git rev-parse gh-pages^{tree})" = "$tree" ]; then
    echo "Сайт не изменился — публиковать нечего."; exit 0
  fi
  parent=(-p gh-pages)
fi
commit=$(git commit-tree "$tree" "${parent[@]}" -m "Deploy site from $(git rev-parse --short HEAD)")
git update-ref refs/heads/gh-pages "$commit"
git push origin gh-pages
echo "Опубликовано: $(git rev-parse --short gh-pages)"
