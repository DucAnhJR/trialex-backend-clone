export interface BannerData {
  title: string;
  description: string;
  image: string;
  link: string;
  tag: string;
}

export const BANNER_DATA: BannerData[] = [
  {
    title: 'Trial Responsibilities',
    description: 'Volunteer your time to support asthma research.',
    image: 'bannerSwiper',
    link: 'https://mrctcenter.org/project/post-trial-responsibilities/',
    tag: 'Urgent',
  },
  {
    title: 'Cancer Clinical',
    description:
      'Learn about clinical trials for cancer treatment and find one that might be right for you',
    image: 'bannerSwiper',
    link: 'https://www.cancerresearch.org/cancer-clinical-trials?campaign=784691',
    tag: 'Urgent',
  },
  {
    title: 'Cancer Information',
    description:
      'Explore the basics of clinical trials, including what they are, how they work, and what to expect.',
    image: 'bannerSwiper',
    link: 'https://www.cancer.gov/research/participate/clinical-trials',
    tag: 'Urgent',
  },
  {
    title: 'Asthma Research',
    description: 'Volunteer your time to support asthma research.',
    image: 'bannerSwiper',
    link: 'https://mrctcenter.org/project/post-trial-responsibilities/',
    tag: 'Urgent',
  },
];
