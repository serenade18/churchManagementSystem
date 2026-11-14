/**
 * The words on the parish homepage. Edit them here: service times, the minister, fellowships,
 * events and congregations. The name, logo, homepage photo, contacts, Paybill number, Paybill codes
 * and project progress come from Settings and the church's own records instead.
 */
export const HOME = {
  motto: 'Nec tamen consumebatur',
  mottoMeaning: 'Yet it was not consumed',
  headline: 'A household of faith on the eastern edge of Nairobi.',
  intro: 'Four congregations, three Sunday services and one family in Christ. Whether you grew up in the PCEA or are walking in for the first time, there is a seat for you.',
  presbytery: 'Nairobi Presbytery',

  sunday: {
    title: 'Every Sunday at Milele',
    note: 'Holy Communion on the first Sunday of each month · Parking in the school field',
    services: [
      { time: '7:00', name: 'First service', language: 'English', note: 'Said liturgy, hymns from the Mission Praise.' },
      { time: '9:00', name: 'Main service', language: 'Gĩkũyũ', note: 'With the Parish Choir. Sunday School meets alongside.' },
      { time: '11:30', name: 'Youth service', language: 'English & Kiswahili', note: 'Praise team, and a sermon for the young.' },
    ],
  },

  minister: {
    name: 'Rev. Wanjiru Kamau',
    role: 'Parish Minister since 2019',
    initials: 'WK',
    quote: 'Moses turned aside to see why the bush was not burnt. Our prayer is that Milele is such a place: somewhere you stop, look again, and meet God.',
    story: 'Milele began as a fellowship under a mango tree in 1994 and became a parish in 2011. Today the Kirk Session of 24 elders cares for more than two thousand members across Milele, Ruai, Mwiki and Githurai.',
  },

  history: [
    { year: '1891', text: 'The Church of Scotland mission reaches Kibwezi, then moves to Thogoto, Kikuyu, in 1898.' },
    { year: '1956', text: 'The Presbyterian Church of East Africa is formed, one church for Kenya and beyond.' },
    { year: '2011', text: 'Milele is made a parish, with its own Kirk Session and three congregations to start.' },
  ],

  fellowships: [
    { name: "Woman's Guild", text: 'Prayer, service and the blue-and-white uniform. Meets Thursdays at 2pm.' },
    { name: 'PCMF', text: "The Presbyterian Church Men's Fellowship. Breakfast and Bible study, first Saturday." },
    { name: 'PCEA Youth', text: 'Fellowship, sports and the December camp, for ages 18 to 35.' },
    { name: 'Sunday School', text: 'Classes for children 3 to 12 during the 9:00 service.' },
    { name: 'Jumuia', text: 'Home fellowships in each district. Find yours with your elder.' },
    { name: 'Parish Choir', text: 'Rehearsals Wednesday evenings. New voices welcome.' },
  ],

  // Dates as YYYY-MM-DD; past events drop off the page by themselves.
  events: [
    { date: '2026-12-06', title: 'Holy Communion Sunday', detail: 'All three services · Communicant members and those preparing' },
    { date: '2026-12-12', title: 'Youth Camp', detail: 'Three days at Kikuyu Campus · Register by 30 November' },
    { date: '2026-12-20', title: 'Carols by Candlelight', detail: 'Milele church grounds, 6pm · Every congregation' },
    { date: '2026-12-25', title: 'Christmas Day Service', detail: 'One combined service at 10am' },
  ],

  congregations: [
    { name: 'Milele', kind: 'Parish church', place: 'Off Kangundo Road, next to Milele Primary', times: '7:00 · 9:00 · 11:30' },
    { name: 'Ruai', kind: 'Congregation', place: 'Ruai Bypass, opposite the Chief’s camp', times: '8:00 · 10:30' },
    { name: 'Mwiki', kind: 'Congregation', place: 'Mwiki Road, near the stage', times: '9:00' },
    { name: 'Githurai', kind: 'Outreach', place: 'Githurai 45, in the community hall', times: '10:00' },
  ],

  join: 'Speak to an usher after any service, or call the parish office, and an elder from your district will welcome you. Membership classes start every January and June.',
}
