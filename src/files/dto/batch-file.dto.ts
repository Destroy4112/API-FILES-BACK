import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class BatchFileUrlsDto {

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    ids: string[];
}
