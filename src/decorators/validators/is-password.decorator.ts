import { registerDecorator, type ValidationOptions } from 'class-validator';

export function IsPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      name: 'isPassword',
      target: object.constructor,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return typeof value === 'string' && /^\S+$/.test(value);
        },
        defaultMessage() {
          return `$property must not contain spaces`;
        },
      },
    });
  };
}
