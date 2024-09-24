from collections import OrderedDict
import typing as tp

from faker.providers.address.es_MX import Provider as AddressProvider


class Provider(AddressProvider):
    __use_weighting__ = True

    city_formats = OrderedDict(
        (
            ("{{first_name}}", 0.1),
            ("{{last_name}}", 0.65),
            ("{{city_prefix}} {{first_name}}", 0.05),
            ("{{city_prefix}} {{last_name}}", 0.05),
            ("{{last_name}} de {{last_name}}", 0.1),
            ("{{city_prefix}} {{last_name}} de {{last_name}}", 0.05),
        )
    )

    city_prefixes = [
        "San",
        "La",
        "El",
        "Los"
    ]

    place_of_birth_format = OrderedDict(
        (
            ("{{city}}\n{{administrative_unit}}", 1.0),
        )
    )

    street_address_formats = (
        "{{street_name}} {{building_number}}",
    )

    address_formats = (
        "{{street_address}}\n{{city}} {{postcode}}\n{{administrative_unit}}",
        "{{street_address}}\n{{secondary_address}} {{postcode}}\n{{administrative_unit}}", 
    )

    secondary_address_formats = (
        
    )

    def city_prefix(self) -> str:
        return self.random_element(self.city_prefixes)

    def city_name(self) -> str:
        if self not in self.generator.providers:
            self.generator.add_provider(self)
        pattern: str = self.random_element(self.city_formats)
        return self.generator.parse(pattern)

    city = city_name

    def place_of_birth(self) -> str:
        if self not in self.generator.providers:
            self.generator.add_provider(self)
        pattern: str = self.random_element(self.place_of_birth_format)
        return self.generator.parse(pattern)

    def street_address(self) -> str:
        if self not in self.generator.providers:
            self.generator.add_provider(self)
        pattern: str = self.random_element(self.street_address_formats)
        return self.generator.parse(pattern)
    
    def address(self) -> str:
        if self not in self.generator.providers:
            self.generator.add_provider(self)
        pattern: str = self.random_element(self.address_formats)
        return self.generator.parse(pattern)
