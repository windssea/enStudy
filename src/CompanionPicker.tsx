import { useEffect, useRef, useState } from "react";
import {
  companions,
  companionInfo,
  isCompanionChoice,
  type CompanionChoice,
  type CompanionId,
} from "../packages/domain/companions";
import { api } from "./api";
import CompanionSticker from "./CompanionSticker";
import { CompanionContext } from "./CompanionContext";
import SceneStage from "./SceneStage";

export default function CompanionPicker({
  childId,
  current = "fox",
  onSaved,
  onNeedProfile,
}: {
  childId?: string;
  current?: CompanionId;
  onSaved: (choice: CompanionChoice) => void;
  onNeedProfile: () => void;
}) {
  const [opened, setOpened] = useState(false),
    [choice, setChoice] = useState<CompanionChoice | null>(null),
    [draft, setDraft] = useState<CompanionId>(current),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [reload, setReload] = useState(0);
  const saveRequest = useRef<AbortController | null>(null);
  const notify = useRef(onSaved);
  notify.current = onSaved;
  useEffect(() => {
    setChoice(null);
    setError("");
    setStatus("");
    setBusy(false);
    if (!opened || !childId) return;
    const controller = new AbortController();
    api<unknown>("/learning/companion", undefined, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!isCompanionChoice(data, childId))
          throw new Error("档案有变化，请重新打开伙伴选择。");
        setChoice(data);
        setDraft(data.companionId);
        notify.current(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "伙伴选择暂时没打开，请重试。",
          );
      });
    return () => {
      controller.abort();
      saveRequest.current?.abort();
    };
  }, [childId, opened, reload]);
  async function save() {
    if (!choice || !childId || busy || draft === choice.companionId) return;
    const controller = new AbortController();
    saveRequest.current = controller;
    setBusy(true);
    setError("");
    setStatus("");
    const accept = (data: unknown) => {
      if (!isCompanionChoice(data, childId))
        throw new Error("档案有变化，请重新打开伙伴选择。");
      setChoice(data);
      setDraft(data.companionId);
      onSaved(data);
      return data;
    };
    try {
      const data = await api<unknown>(
        "/learning/companion",
        {
          childId,
          companionId: draft,
          expectedVersion: choice.version,
          requestId: crypto.randomUUID(),
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const saved = accept(data);
      setStatus(
        `保存好了，${companionInfo(saved.companionId).name}陪你一起学习。`,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      // A lost response may follow a committed save. Read the current state;
      // never blindly replay a stale preference over another device's choice.
      try {
        const latest = await api<unknown>("/learning/companion", undefined, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const saved = accept(latest);
        if (saved.companionId === draft && saved.version > choice.version)
          setStatus(
            `已确认，${companionInfo(saved.companionId).name}是现在的伙伴。`,
          );
        else setError("已读取现在的伙伴。若要更换，请重新选择后保存。");
      } catch {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "暂时没保存好，请稍后再试。",
          );
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (saveRequest.current === controller) saveRequest.current = null;
    }
  }
  return (
    <details
      className="companion-picker"
      onToggle={(event) => setOpened(event.currentTarget.open)}
    >
      <summary>
        换个伙伴：橙橙 / 皮卡丘 <span>现在是{companionInfo(current).name}</span>
      </summary>
      {opened && (
        <div className="companion-picker-body">
          {!childId ? (
            <>
              <p>先选你的探险档案，伙伴选择就能跟着你保存。</p>
              <button
                type="button"
                className="secondary"
                onClick={onNeedProfile}
              >
                选择探险档案
              </button>
            </>
          ) : !choice ? (
            <>
              {error ? (
                <p role="alert">
                  {error}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setReload((value) => value + 1)}
                  >
                    重新打开
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={onNeedProfile}
                  >
                    查看探险档案
                  </button>
                </p>
              ) : (
                <p role="status">正在打开你的伙伴选择…</p>
              )}
            </>
          ) : (
            <>
              <fieldset disabled={busy}>
                <legend>选择陪你学习的伙伴</legend>
                <div className="companion-options">
                  {companions.map((row) => (
                    <label
                      className="companion-option"
                      key={row.id}
                      data-selected={draft === row.id}
                    >
                      <svg viewBox="0 0 190 205" aria-hidden="true">
                        <CompanionSticker kind={row.id} />
                      </svg>
                      <span className="companion-option-heading">
                        <input
                          type="radio"
                          name={`companion-${childId}`}
                          value={row.id}
                          checked={draft === row.id}
                          onChange={() => {
                            setDraft(row.id);
                            setError("");
                            setStatus("");
                          }}
                        />
                        <strong>{row.name}</strong>
                      </span>
                      <span>{row.detail}</span>
                      <small>
                        {choice.companionId === row.id
                          ? "当前伙伴"
                          : draft === row.id
                            ? "待保存"
                            : "可选择"}
                      </small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="companion-preview">
                <p className="eyebrow">
                  试选预览 · {companionInfo(draft).name}
                </p>
                <CompanionContext.Provider value={draft}>
                  <SceneStage key={draft} kind="partner" />
                </CompanionContext.Provider>
                <p className="footnote">
                  这里可以先打招呼、看背面。保存后，才会成为你的探险伙伴。
                </p>
              </div>
              <button
                type="button"
                className="secondary"
                disabled={busy || draft === choice.companionId}
                onClick={() => void save()}
              >
                {busy
                  ? "正在保存…"
                  : draft === choice.companionId
                    ? "已经是我的伙伴"
                    : `让${companionInfo(draft).name}陪我学习`}
              </button>
              {error && (
                <p className="notice error" role="alert">
                  {error}
                  <button
                    type="button"
                    className="text-button"
                    onClick={onNeedProfile}
                  >
                    查看探险档案
                  </button>
                </p>
              )}
              {status && (
                <p className="notice success" role="status">
                  {status}
                </p>
              )}
              <p className="footnote">
                换伙伴不改变成绩，也不会打断正在做的练习。
              </p>
            </>
          )}
        </div>
      )}
    </details>
  );
}
