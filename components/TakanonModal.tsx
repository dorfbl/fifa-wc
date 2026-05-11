'use client';

interface Props {
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[#f97316] font-bold text-base mb-3 border-b border-c-border pb-2">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm text-c-text leading-relaxed">
      <span className="text-[#f97316] mt-0.5 shrink-0">•</span>
      <span>{children}</span>
    </div>
  );
}

function ScoreRow({ label, points, color = 'text-[#f97316]' }: { label: string; points: string; color?: string }) {
  return (
    <div className="flex justify-between items-center bg-c-input rounded-xl px-4 py-3">
      <span className={`font-bold text-lg ${color}`}>{points}</span>
      <span className="text-c-text text-sm">{label}</span>
    </div>
  );
}

export default function TakanonModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-c-bg overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-c-nav border-b border-c-border px-4 py-4 flex items-center justify-between z-10">
        <button onClick={onClose} className="text-c-muted text-sm font-bold">✕ סגור</button>
        <h1 className="text-c-text font-bold text-lg">📋 תקנון המשחק</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 pb-32 max-w-lg mx-auto w-full">

        {/* Intro */}
        <div className="bg-[#f97316] rounded-2xl p-4 mb-6 text-center">
          <div className="text-3xl mb-1">⚽</div>
          <div className="text-white font-bold text-lg">מונדיאל חברים 2026</div>
          <div className="text-white/80 text-sm mt-1">משחק ניחושים פרטי לחברים</div>
        </div>

        {/* Scoring */}
        <Section title="ניקוד למשחק">
          <ScoreRow label="תוצאה מדויקת (שני הסטים נכונים)" points="+3" color="text-[#22c55e]" />
          <ScoreRow label="ניחוש מנצח נכון, תוצאה לא מדויקת" points="+1" color="text-[#f97316]" />
          <ScoreRow label="ניחוש שגוי (מנצח לא נכון)" points="0" color="text-c-subtle" />
          <ScoreRow label="לא הוגשה תחזית" points="0" color="text-c-subtle" />
        </Section>

        {/* Doubles */}
        <Section title="הכפלת נקודות ×2">
          <Rule>לכל שחקן יש <strong>שתי הכפלות</strong> לאורך כל הטורניר</Rule>
          <Rule>הכפלה אחת לשלב <strong>הבתים</strong> — ניתן להשתמש בה בכל משחק בית אחד לבחירתך</Rule>
          <Rule>הכפלה אחת לשלב <strong>הנוקאאוט</strong> (כולל הגמר) — ניתן להשתמש בה בכל משחק נוקאאוט אחד לבחירתך</Rule>
          <Rule>שימוש בהכפלה מכפיל את כל הנקודות של אותו משחק: <strong>0 / 2 / 6</strong></Rule>
          <Rule>בוחרים את ההכפלה בעת הגשת התחזית או עריכתה — ניתן לשנות עד נעילת המשחק</Rule>
          <Rule>כל הכפלה ניתן להשתמש בה <strong>פעם אחת בלבד</strong></Rule>
        </Section>

        {/* Tournament Winner */}
        <Section title="ניחוש אלופת המונדיאל 🏆">
          <ScoreRow label="ניחוש האלופה — אם נכון" points="+8" color="text-[#eab308]" />
          <Rule>יש לבחור אלופה <strong>לפני תחילת המשחק הראשון</strong> של הטורניר</Rule>
          <Rule>לאחר תחילת הטורניר לא ניתן לשנות את הבחירה</Rule>
          <Rule>בחירות כל השחקנים <strong>נסתרות</strong> עד לתחילת המשחק הראשון — אין לאחרים גישה לניחוש שלך</Rule>
          <Rule>הנקודות יתווספו אוטומטית בסיום הגמר</Rule>
        </Section>

        {/* Prediction Window */}
        <Section title="חלון הגשת תחזיות">
          <Rule>ניתן להגיש או לערוך תחזית עד <strong>5 דקות לפני תחילת המשחק</strong></Rule>
          <Rule>לאחר מכן — הגשה נעולה</Rule>
          <Rule>אם לא הוגשה תחזית עד הנעילה — הניקוד למשחק זה יהיה אוטומטית <strong>0 נקודות</strong></Rule>
        </Section>

        {/* Privacy */}
        <Section title="פרטיות תחזיות">
          <Rule>תחזיות השחקנים האחרים <strong>נסתרות לחלוטין</strong> עד שהמשחק מתחיל</Rule>
          <Rule>רק לאחר שהמשחק החל ניתן לראות את תחזיות כלל השחקנים ואת הניקוד</Rule>
        </Section>

        {/* Leaderboard */}
        <Section title="טבלת הדירוג">
          <Rule>הדירוג נקבע לפי הסדר הבא:</Rule>
          <div className="bg-c-input rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[#f97316] font-bold w-5 text-center">1</span>
              <span className="text-c-text text-sm">סך כל הנקודות</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#f97316] font-bold w-5 text-center">2</span>
              <span className="text-c-text text-sm">מספר תוצאות מדויקות (3 נקודות)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#f97316] font-bold w-5 text-center">3</span>
              <span className="text-c-text text-sm">מספר ניחושי מנצח נכונים (1 נקודה)</span>
            </div>
          </div>
          <Rule>טבלת הדירוג <strong>נסתרת</strong> מכל השחקנים בזמן משחק הגמר בלבד — תוצג מחדש בסיומו</Rule>
        </Section>

        {/* Stats */}
        <Section title="סטטיסטיקות אישיות">
          <Rule>בפרופיל האישי תוכל לראות: סך נקודות, מקום בטבלה, מספר תוצאות מדויקות, מספר ניחושי מנצח נכונים ואחוז הצלחה</Rule>
          <Rule><strong>אחוז הצלחה</strong> = (ניחושים שזכו בנקודות כלשהן ÷ סך כל הניחושים) × 100</Rule>
          <Rule>ניתן לראות את בחירת ההכפלות שנותרו לך בפרופיל האישי</Rule>
        </Section>

        {/* Summary table */}
        <div className="bg-c-card rounded-2xl border border-c-border p-4">
          <h2 className="text-c-text font-bold text-sm mb-3 text-center">סיכום מהיר</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['תוצאה מדויקת', '+3 נק׳'],
              ['מנצח נכון', '+1 נק׳'],
              ['הכפלה × 2', '×2 נק׳'],
              ['אלופה נכונה', '+8 נק׳'],
              ['נעילה', '5 דק׳ לפני'],
              ['הכפלות', '2 סה״כ'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center bg-c-input rounded-lg px-3 py-2">
                <span className="text-[#f97316] font-bold">{val}</span>
                <span className="text-c-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
