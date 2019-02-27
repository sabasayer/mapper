import dateUtils from '@/utilities/date-utils';

export enum EnumPropertyMappingType {
  Date_ApiToUi = 1,
  Date_UiToApi = 2,
  Date_ToApi = 3,
  String_ToLowercase = 4,
  String_ToCapitalize = 5,
  String_ToUpparcase = 6,
}

/**
 * Creates a mapper between two types
 */
export interface PropertyMappingOptions {
  ignore?: boolean;
  equalsTo?: string;
  mappingType?: EnumPropertyMappingType;
  mapperFunction?(source: any): any;
}

export class BaseMapper<Source, Target> {
  protected propertyMapperOptions: {
    [key: string]: PropertyMappingOptions;
  } = {};
  protected reversePropertyMapperOptions: {
    [key: string]: PropertyMappingOptions;
  } = {};

  protected oneToOnePropKeys: string[] = [];
  /**
   * İf this is set to true maps all source props to
   * target if there is no mapperOption set for that prop
   */
  protected mapAllPropsOneToOne?: boolean = false;

  constructor(mapAllPropsOneToOne?: boolean) {
    this.mapAllPropsOneToOne = mapAllPropsOneToOne;
  }

  oneToOneProps(...propKeys: string[]) {
    if (propKeys) this.oneToOnePropKeys = propKeys;
  }

  /**
   * adds new mapper option for property
   * @param propKey target prop key
   * @param mapFrom map prop with this options
   * @param mappingType for special behavior
   */
  forProp(propKey: string, mapFrom: string | ((source: Source) => any), mappingType?: EnumPropertyMappingType) {
    //TODO: if mapFrom and mappingType exists create reverse mapFrom with revers mappingType
    if (typeof mapFrom === "string") {
      this.propertyMapperOptions[propKey] = { equalsTo: mapFrom, mappingType };
    } else if (mapFrom instanceof Function) {
      this.propertyMapperOptions[propKey] = { mapperFunction: mapFrom, mappingType };
    } else {
      throw new Error(
        "for key " + propKey + " mapFrom is not string or function !"
      );
    }
  }


  /**
   * adds new mapper option for property
   * @param propKey source prop key
   * @param mapFrom map prop with this options
   * @param mappingType for special behavior
   */
  forPropReverse(propKey: string, mapFrom: string | ((source: Target) => any), mappingType?: EnumPropertyMappingType) {
    if (typeof mapFrom === "string") {
      this.reversePropertyMapperOptions[propKey] = { equalsTo: mapFrom, mappingType };
    } else if (mapFrom instanceof Function) {
      this.reversePropertyMapperOptions[propKey] = { mapperFunction: mapFrom, mappingType };
    }
  }

  /**
   * Ignore property of source object
   * @param propKey property of source to be ignored
   */
  ignoreProp(propKey: string) {
    this.propertyMapperOptions[propKey] = { ignore: true };
  }

  /**
   * Ignore property of source object
   * @param propKey property of source to be ignored
   */
  ignorePropReverse(propKey: string) {
    this.reversePropertyMapperOptions[propKey] = { ignore: true };
  }

  /**
   * Map prop using pre defined mapping options. If there is no
   * option for that prop it will be mapped directly.
   * @param source source object that will be mapped from
   */
  map = (source: Source): Target => {
    let target: any = this.mapDefault(source);
    target = this.mapWithOptions(source, target);
    return target;
  };

  /**
   * Map prop using pre defined mapping options. If there is no
   * option for that prop it will be mapped directly.
   * @param source source object that will be mapped from
   */
  mapReverse = (source: Target): Source =>  {
		console.log('TCL: source', source)
    let target: any = this.mapDefault(source, true);
    target = this.mapWithOptions(source, target, true);
    return target;
  }

  /**
   * maps source object to target with same property keys
   * if there is no predefined mapping options exists
   * @param source Source object
   * @param reverse İs reverse mapping
   */
  protected mapDefault = <Type1, Type2>(
    source: Type1,
    reverse?: boolean
  ): Type2 => {
    let target: any = {};
    try {
      let options = reverse
        ? this.reversePropertyMapperOptions
        : this.propertyMapperOptions;

      if (this.mapAllPropsOneToOne) {
        for (var key in source) {
          let propMapperOption = options[key];
          if (!propMapperOption) {
            target[key] = this.mapWithKeyString(key, source);
          }
        }
      }
      else {
        this.oneToOnePropKeys.forEach(key => {
          let propMapperOption = options[key];
          if (!propMapperOption) {
            target[key] = this.mapWithKeyString(key, source);
          }
        });
      }

    } catch (error) {
      console.error(error);
    }
    return target;
  };

  /**
   * Map with options
   * @param source source object
   * @param target mapped object
   * @param reverse is reverse mapping
   */
  protected mapWithOptions<T1, T2>(
    source: T1,
    target: T2,
    reverse?: boolean
  ): T2 {
    try {
      let options = reverse
        ? this.reversePropertyMapperOptions
        : this.propertyMapperOptions;

      for (let key in options) {
        let propMapperOption = options[key];
        if (!propMapperOption.ignore) {
          if (!!propMapperOption.equalsTo) {
            (target as any)[key] = this.mapWithKeyString(
              propMapperOption.equalsTo,
              source
            );
            if (!!propMapperOption.mappingType) {
              (target as any)[key] = this.mapWithMappingTypes(
                (target as any)[key],
                propMapperOption.mappingType);
            }
          } else if (propMapperOption.mapperFunction) {
            (target as any)[key] = propMapperOption.mapperFunction(source);
          }
        }
      }

      return target;
    } catch (error) {
      console.error(error);
      return target;
    }
  }

  /**
   * Map with using equalsTo string , if it containes '.' notations
   * try to go deep in source object
   * @param equalsTo source parameter key that will be mapped
   * @param source source object
   */
  protected mapWithKeyString<T1>(key: string, source: T1): any {
    if (key.indexOf(".") > -1) {
      let hierarchies = key.split(".");
      let hierarchiesLength = hierarchies.length;
      try {
        if (hierarchiesLength > 1) {
          let target: any = source;
          for (let index = 0; index < hierarchiesLength; index++) {
            if (target != undefined) {
              target = (target as any)[hierarchies[index]];
            }
          }
          if (target != undefined) return target;
        }
      } catch (error) {
        console.error(error);
      }
    }
    return (source as any)[key];
  }

  /**
   * Map param with different predefined options
   * @param sourceValue Source Property Value
   * @param mappingType Mapping type for different mapping option
   */
  protected mapWithMappingTypes(sourceValue: any, mappingType: EnumPropertyMappingType) {
    try {
      switch (mappingType) {
        case EnumPropertyMappingType.Date_ApiToUi:
          return dateUtils.dateFormatFromApiDateString(sourceValue);
        case EnumPropertyMappingType.Date_ToApi:
          return dateUtils.dateToApiDate(sourceValue);
        case EnumPropertyMappingType.Date_UiToApi:
          return dateUtils.dateStringToApiDate(sourceValue);
        case EnumPropertyMappingType.String_ToLowercase:
          return (sourceValue as string).toLocaleLowerCase();
        case EnumPropertyMappingType.String_ToUpparcase:
          return (sourceValue as string).toUpperCase();
        case EnumPropertyMappingType.String_ToCapitalize:
          return (sourceValue as string).charAt(0).toUpperCase() + (sourceValue as string).substr(1);
        default:
          return sourceValue;
          break;
      }
    } catch (error) {
      console.error(error);
    }
  }

  mapArray = (sources: Source[]): Target[] => {
    let targets: any[] = sources.map(this.map);
    return targets;
  };

  mapArrayReverse = (sources: Target[]): Source[] => {
    let targets: any[] = sources.map(this.mapReverse);
    return targets;
  };

  mapDictionary = (sources: {
    [key: string]: Source;
  }): { [key: string]: Target } => {
    let targets: any = {};
    for (let key in sources) {
      targets[key] = this.map(sources[key]);
    }
    return targets;
  };

  mapDictionaryReverse = (sources: {
    [key: string]: Target;
  }): { [key: string]: Source } => {
    let targets: any = {};
    for (let key in sources) {
      targets[key] = this.mapReverse(sources[key]);
    }
    return targets;
  };
}
