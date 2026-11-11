'use client'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { PageHeader } from '@/components/common/PageHeader'
import { isVirtual, type AppData } from '@/lib/types'
import { RULES, ruleLabel, rulePoints } from '@/lib/rules'

/** 사용법 + 지금 적용 중인 추천 조건 (설정값을 그대로 읽어 보여줌) */
export function GuidePage({ data }: { data: AppData }) {
  const router = useRouter()
  const st = data.settings
  const points = rulePoints(st.rule)
  const real = data.teachers.filter((t) => !isVirtual(t))
  const lecturers = real.filter((t) => t.employmentType === '시간강사').length
  const excluded = real.filter((t) => t.poolStatus === '제외').length
  const blocked = data.teachers.filter((t) => t.blocked?.length).length

  const flows: { when: string; steps: [string, string, string][] }[] = [
    {
      when: '학기 초 한 번',
      steps: [
        ['시간표 올리기', '나이스 교사 시간표 PDF를 올리면 교사, 담당 학년, 수업이 한 번에 등록돼요.', '/timetable'],
        ['학사일정 올리기', '학사일정 PDF를 올리면 휴업일·방학은 결강 수업에서 빠지고 행사가 달력에 표시돼요.', '/calendar'],
        ['교사 관리', '시간강사는 보강 후보에서 빠져요. 담임 반을 넣고(‘담임 반 일괄 입력’으로 명단 붙여넣기), 회의·육아시간은 ‘보강 불가 시간’으로 막아 두세요.', '/teachers'],
        ['추천 방식 정하기', '설정에서 담임·학년 우선, 균등 배정 우선, 동일 교과 우선, 당일 여유 우선 중 고르거나 조건을 직접 켜고 끄며 순서를 정해요.', '/settings'],
        ['구글 시트 연결', '설정에서 한 번만 연결하면 체크한 보강을 시트 ‘보강’ 탭에 올릴 수 있어요.', '/settings'],
        ['백업 저장 위치 정하기', '설정 → 데이터 관리에서 ‘같은 파일에 덮어쓰기’를 고르면 매일 처음 열 때 그 파일에 자동 저장돼요.', '/settings'],
      ],
    },
    {
      when: '결강이 생길 때',
      steps: [
        ['결강 등록', '교사, 날짜, 사유(나이스 근무상황)를 골라요. 조퇴·외출은 ‘교시 선택’으로 빠지는 교시만 고르세요.', '/absence'],
        ['가상 교사 수업', '담당 선생님이 없는 수업은 결강 교사에서 ‘가상 교사’를 골라 이번 주·이번 달까지 한 번에 등록해요.', '/absence'],
        ['배정 확인', '추천된 보강 교사와 예비1·2를 확인해요. ‘시간표 보기’를 펼치면 후보들의 그날 시간표를 한 표로 비교하고 바로 바꿀 수 있어요.', '/assignments'],
        ['추천 방식 바꾸기', '배정 확인 맨 위 ‘추천 방식’에서 바꾸면, 바뀌는 배정을 먼저 보여 주고 확정 전 배정만 다시 추천해요.', '/assignments'],
        ['체크 → 확정 → 시트에 올리기', '줄을 체크해 ‘선택 확정’, 이어서 ‘구글 시트에 올리기’. 필요 없는 줄은 ‘선택 삭제’.', '/assignments'],
      ],
    },
    {
      when: '정기적으로',
      steps: [
        ['매일 · 자동 백업', '데이터는 이 브라우저에만 있어요. 매일 처음 열 때 백업 파일이 자동 저장돼요.', '/settings'],
        ['매월 말 · 시간강사 안내 문자', '24일부터 알림이 떠요. 다음 달 쉬는 날을 골라 선생님별 문자를 고치고 복사해요. 여러 달을 묶을 수도 있어요.', '/messages'],
        ['수시 · 이번 주 시간표', '선생님별로 한 주의 수업, 결강, 보강을 한눈에 봐요.', '/week'],
        ['수시 · 결보강 통계', '보강 순위와 결강 순위로 보강이 한쪽에 몰리지 않았는지 확인해요.', '/stats'],
      ],
    },
  ]

  const tips: [string, string][] = [
    ['다른 컴퓨터에서 쓰기', '설정 → ‘JSON 백업 불러오기’로 백업 파일을 불러오면 그대로 이어서 쓸 수 있어요.'],
    ['확정된 보강 바꾸기', '확정을 취소하거나, 예비 교사를 ‘보강으로’ 올리세요. 추천 방식을 바꿔도 확정된 배정은 그대로예요.'],
    ['보강 교사가 결강하게 되면', '그 선생님 결강을 등록하면 확정 전 보강은 자동으로 다른 교사로 바뀌고, 확정된 보강은 알림으로 알려 줘요.'],
    ['특정 시간 보강 막기', '교사 관리 → ‘보강 불가 시간’에서 요일·교시를 막아 두면 그 시간엔 추천하지 않아요.'],
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
    ...st.rule.order
      .filter((k) => st.rule.on.includes(k))
      .map((k): [string, string] => [RULES[k].label, `${RULES[k].desc} → +${points[k]}점`]),
    ['당일 기존 보강', '같은 날 이미 맡은 보강 1건마다 −5점'],
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
                      <span className="mt-0.5 block text-[13px] leading-5 text-ink-2 [word-break:keep-all]">{desc}</span>
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
          <h2 className="text-lg font-extrabold">추천 순서</h2>
          <p className="mt-1 text-[13px] text-subtle">
            지금 방식: <b className="text-ink">{ruleLabel(st.rule)}</b>. 남은 후보 중 점수가 가장 높은 교사가 보강, 2·3위가 예비1·예비2가 돼요.
          </p>
          <dl className="mt-4 flex flex-col divide-y divide-line">
            {soft.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-2.5 text-[14px]">
                <dt className="font-bold">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
          <button onClick={() => router.push('/settings')} className="m3-btn m3-btn-sm m3-outlined mt-4">
            추천 방식·한도 바꾸기 (설정)
          </button>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-extrabold">알아 두면 좋은 것</h2>
        <dl className="mt-3 grid gap-x-8 md:grid-cols-2">
          {tips.map(([k, v]) => (
            <div key={k} className="border-t border-line py-3 text-[14px]">
              <dt className="font-bold">{k}</dt>
              <dd className="mt-0.5 text-[13px] leading-5 text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  )
}
