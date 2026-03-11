export const fileConfiguration = {
  baseDir: 'public/uploads',
  subdirectories: {
    personalId: {
      path: 'personalId',
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxSize: 5 * 1024 * 1024,
      namingPattern: 'pid-[timestamp]-[originalname]',
    },
    profilePhoto: {
      path: 'profilePhoto',
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxSize: 2 * 1024 * 1024,
      namingPattern: 'profile-[timestamp]',
    },
    documents: {
      path: 'documents',
      allowedTypes: ['application/pdf', 'image/jpeg'],
      maxSize: 10 * 1024 * 1024,
      namingPattern: 'doc-[timestamp]-[originalname]',
    },
  },
};
