'use client'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { PageHeader } from '@/components/common/PageHeader'
import { isVirtual, type AppData } from '@/lib/types'

/** 사용법 + 지금 적용 중인 추천 조건 (설정값을 그대로 읽어 보여줌) */
export function GuidePage({ data }: { data: AppData }) {
  const router = useRouter()
  const st = data.settings
  const w = st.weights
  const real = data.teachers.filter((t) => !isVirtual(t))
  const lecturers = real.filter((t) => t.employmentType === '시간강사').length
  const excluded = real.filter((t) => t.poolStatus === '제외').length
  const blocked = data.teachers.filter((t) => t.blocked?.length).length

  const flows: { when: string; steps: [string, string, string][] }[] = [
    {
      when: '학기 초 한 번',
      steps: [
        ['시간표 올리기', '나이스 교사 시간표 PDF를 올리면 교사·담당 학년·수업이 한 번에 등록돼요.', '/timetable'],
        ['학사일정 올리기', '학사일정 PDF를 올리면 휴업일·방학이 자동으로 빠지고 행사가 달력에 표시돼요.', '/calendar'],
        ['교사 관리', '시간강사로 바꾸면 보강 후보에서 빠져요. 회의·육아시간은 ‘보강 불가 시간’으로 막아 두세요.', '/teachers'],
        ['구글 시트 연결', '설정 맨 아래에서 한 번만 연결하면 체크한 보강을 시트 ‘보강’ 탭에 올릴 수 있어요.', '/settings'],
      ],
    },
    {
      when: '결강이 생길 때',
      steps: [
        ['결강 등록', '교사·날짜·사유를 고르고, 조퇴·외출이면 ‘교시 선택’으로 빠지는 교시만 고르세요.', '/absence'],
        ['배정 확인', '추천된 보강 교사와 예비1·2를 확인하고, ‘시간표 보기’를 펼쳐 바꿀 수 있어요.', '/assignments'],
        ['체크 → 확정 → 시트에 올리기', '확정할 줄을 체크해 ‘선택 확정’, 그다음 ‘구글 시트에 올리기’를 누르세요.', '/assignments'],
      ],
    },
    {
      when: '정기적으로',
      steps: [
        ['매주 · 백업 파일 받기', '데이터는 이 브라우저에만 있어요. 알림이 뜨면 백업 파일을 받아 두세요.', '/settings'],
        ['매월 말 · 시간강사 안내 문자', '다음 달 휴업일·행사를 골라 시간강사 선생님별 문자를 복사해요.', '/messages'],
        ['수시 · 이번 주 시간표', '선생님별로 한 주의 수업·결강·보강을 한눈에 봐요.', '/week'],
      ],
    },
  ]

  const hard = [
    '결강한 교사 본인',
    `보강 후보 ‘제외’ 교사 (현재 ${excluded}명 · 시간강사 ${lecturers}명 포함)`,
    '‘가상’ 교사 (시간표의 빈 수업 자리)',
    '같은 교시에 자기 수업이 있는 교사',
    '같은 교시에 이미 다른 보강을 맡은 교사',
    '그날 결강·출장 등으로 학교에 없는 교사',
    `보강 불가 시간으로 막아 둔 교사 (현재 ${blocked}명)`,
    `보강을 넣으면 그날 수업이 ${st.maxDaily}개 이상이 되는 교사`,
    `보강을 넣으면 연속 수업이 ${st.maxConsecutive}교시 이상이 되는 교사`,
  ]
  const soft: [string, string][] = [
    ['같은 학년 담당', `결강 수업과 같은 학년을 가르치면 +${w.grade}점 (보강 후보 ‘추가포함’ 교사도 같은 학년으로 봄)`],
    ['그날 여유', `보강을 넣어도 그날 수업이 2개 이하면 +${w.daily}점, 3개면 +5점`],
    ['보강 공평성', `누적 보강이 적을수록 높음: 0회면 +${w.fairness}점, 10회 이상이면 0점`],
    ['연속 부담', '보강을 넣어도 연속 수업이 2교시 이하면 +10점'],
    ['그날 이미 맡은 보강', '같은 날 이미 맡은 보강 1건마다 −5점'],
  ]

  return (
    <>
      <PageHeader
        eyebrow="Guide"
        title="사용법 · 추천 조건"
        desc="처음 쓰실 때 순서대로 따라 하시고, 보강 추천이 어떤 기준으로 정해지는지 확인하세요. 아래 숫자는 지금 설정값이에요."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {flows.map((f, fi) => (
          <Card key={f.when}>
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-subtle">Step {String(fi + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 text-lg font-extrabold">{f.when}</h2>
            <ol className="mt-4 flex flex-col divide-y divide-line">
              {f.steps.map(([title, desc, href], i) => (
                <li key={title}>
                  <button onClick={() => router.push(href)} className="group flex w-full gap-3 py-3 text-left">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-point text-[12px] font-bold text-on-point">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[15px] font-bold">
                        {title}
                        <ChevronRight size={15} className="text-subtle transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-ink-2">{desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-extrabold">보강 후보에서 빠지는 경우</h2>
          <p className="mt-1 text-[13px] text-subtle">아래 중 하나라도 해당하면 추천하지 않아요.</p>
          <ul className="mt-4 flex flex-col gap-2 text-[14px]">
            {hard.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-bad" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-extrabold">추천 점수</h2>
          <p className="mt-1 text-[13px] text-subtle">남은 후보 중 점수가 가장 높은 교사가 보강, 2·3위가 예비1·예비2가 돼요.</p>
          <dl className="mt-4 flex flex-col divide-y divide-line">
            {soft.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-2.5 text-[14px]">
                <dt className="font-bold">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
          <button onClick={() => router.push('/settings')} className="m3-btn m3-btn-sm m3-outlined mt-4">
            점수·한도 바꾸기 (설정)
          </button>
        </Card>
      </div>
    </>
  )
}
